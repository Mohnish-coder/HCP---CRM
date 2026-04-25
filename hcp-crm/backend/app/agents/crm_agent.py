"""
LangGraph Agent for HCP CRM - Log Interaction Screen
Tools:
  1. log_interaction       – capture & AI-enrich a new HCP interaction
  2. edit_interaction      – modify fields of an existing interaction
  3. get_interaction       – retrieve a single interaction by ID
  4. list_interactions     – search/filter interactions by HCP name or date
  5. analyze_hcp_insights  – generate AI-driven insights/next-step recommendations for an HCP
"""

import os
import json
from datetime import datetime
from typing import Annotated, Any
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict
from sqlalchemy.orm import Session


# --------------------------------------------------------------------------- #
# LLM
# --------------------------------------------------------------------------- #
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
PRIMARY_MODEL   = "llama-3.1-8b-instant"      # replaces decommissioned gemma2-9b-it
FALLBACK_MODEL  = "llama-3.3-70b-versatile"

llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model=PRIMARY_MODEL,
    temperature=0.2,
)


# --------------------------------------------------------------------------- #
# Agent State
# --------------------------------------------------------------------------- #
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    db_session: Any          # SQLAlchemy Session (injected at runtime)
    last_action: str
    interaction_data: dict


# --------------------------------------------------------------------------- #
# Tool helpers  (db injected via closure)
# --------------------------------------------------------------------------- #
def make_tools(db: Session):
    from app.db.database import Interaction

    # ------------------------------------------------------------------ #
    # Tool 1 – Log Interaction
    # ------------------------------------------------------------------ #
    @tool
    def log_interaction(
        hcp_name: str,
        raw_notes: str,
        interaction_type: str = "visit",
        hcp_specialty: str = "",
        hcp_institution: str = "",
        products_discussed: str = "",
        interaction_date: str = "",
    ) -> dict:
        """
        Logs a new interaction with an HCP (Healthcare Professional).
        Uses the LLM to auto-summarise raw notes, extract next steps,
        and infer sentiment before persisting to the database.
        """
        # AI enrichment via Groq
        enrichment_prompt = f"""
You are a life-science CRM assistant. Given raw field-rep notes, extract:
1. A concise professional summary (2-3 sentences)
2. Clear next steps (bullet list)
3. Sentiment: positive | neutral | negative

Raw notes: {raw_notes}

Respond ONLY as valid JSON with keys: summary, next_steps, sentiment
"""
        enriched = {"summary": raw_notes[:200], "next_steps": "Follow up", "sentiment": "neutral"}
        try:
            ai_resp = llm.invoke([HumanMessage(content=enrichment_prompt)])
            text = ai_resp.content.strip()
            if text.startswith("```"):
                text = "\n".join(text.split("\n")[1:-1])
            enriched = json.loads(text)
        except Exception:
            pass

        products = [p.strip() for p in products_discussed.split(",") if p.strip()]
        inter_date = datetime.utcnow()
        if interaction_date:
            try:
                inter_date = datetime.fromisoformat(interaction_date)
            except ValueError:
                pass

        db_item = Interaction(
            hcp_name=hcp_name,
            hcp_specialty=hcp_specialty,
            hcp_institution=hcp_institution,
            interaction_type=interaction_type,
            interaction_date=inter_date,
            products_discussed=products,
            summary=enriched.get("summary", ""),
            next_steps=enriched.get("next_steps", ""),
            sentiment=enriched.get("sentiment", "neutral"),
            raw_notes=raw_notes,
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return {
            "id": db_item.id,
            "hcp_name": db_item.hcp_name,
            "summary": db_item.summary,
            "next_steps": db_item.next_steps,
            "sentiment": db_item.sentiment,
            "status": "logged",
        }

    # ------------------------------------------------------------------ #
    # Tool 2 – Edit Interaction
    # ------------------------------------------------------------------ #
    @tool
    def edit_interaction(interaction_id: int, field: str, value: str) -> dict:
        """
        Edits a specific field of an existing HCP interaction by ID.
        Supported fields: hcp_name, hcp_specialty, hcp_institution,
        interaction_type, summary, next_steps, sentiment, raw_notes,
        products_discussed.
        """
        item = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not item:
            return {"error": f"Interaction {interaction_id} not found"}

        allowed = {
            "hcp_name", "hcp_specialty", "hcp_institution",
            "interaction_type", "summary", "next_steps",
            "sentiment", "raw_notes",
        }
        if field not in allowed and field != "products_discussed":
            return {"error": f"Field '{field}' is not editable"}

        if field == "products_discussed":
            setattr(item, field, [p.strip() for p in value.split(",") if p.strip()])
        else:
            setattr(item, field, value)

        item.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(item)
        return {"id": item.id, "updated_field": field, "new_value": value, "status": "updated"}

    # ------------------------------------------------------------------ #
    # Tool 3 – Get Interaction
    # ------------------------------------------------------------------ #
    @tool
    def get_interaction(interaction_id: int) -> dict:
        """Retrieves full details of a single HCP interaction by its ID."""
        item = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not item:
            return {"error": f"Interaction {interaction_id} not found"}
        return {
            "id": item.id,
            "hcp_name": item.hcp_name,
            "hcp_specialty": item.hcp_specialty,
            "hcp_institution": item.hcp_institution,
            "interaction_type": item.interaction_type,
            "interaction_date": str(item.interaction_date),
            "products_discussed": item.products_discussed,
            "summary": item.summary,
            "next_steps": item.next_steps,
            "sentiment": item.sentiment,
            "raw_notes": item.raw_notes,
        }

    # ------------------------------------------------------------------ #
    # Tool 4 – List / Search Interactions
    # ------------------------------------------------------------------ #
    @tool
    def list_interactions(hcp_name: str = "", limit: int = 10) -> dict:
        """
        Lists recent HCP interactions. Optionally filter by HCP name substring.
        Returns up to `limit` results (max 50).
        """
        limit = min(limit, 50)
        query = db.query(Interaction)
        if hcp_name:
            query = query.filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
        items = query.order_by(Interaction.created_at.desc()).limit(limit).all()
        return {
            "count": len(items),
            "interactions": [
                {
                    "id": i.id,
                    "hcp_name": i.hcp_name,
                    "interaction_type": i.interaction_type,
                    "interaction_date": str(i.interaction_date),
                    "sentiment": i.sentiment,
                    "summary": (i.summary or "")[:100],
                }
                for i in items
            ],
        }

    # ------------------------------------------------------------------ #
    # Tool 5 – Analyze HCP Insights
    # ------------------------------------------------------------------ #
    @tool
    def analyze_hcp_insights(hcp_name: str) -> dict:
        """
        Uses the LLM (llama-3.3-70b-versatile) to generate AI-driven
        engagement insights and next-step recommendations for a given HCP,
        based on their full interaction history.
        """
        items = (
            db.query(Interaction)
            .filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
            .order_by(Interaction.created_at.desc())
            .limit(10)
            .all()
        )
        if not items:
            return {"error": f"No interactions found for HCP '{hcp_name}'"}

        history = "\n".join(
            [
                f"- [{i.interaction_date}] {i.interaction_type}: {i.summary} | Sentiment: {i.sentiment}"
                for i in items
            ]
        )
        analysis_llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model=FALLBACK_MODEL,
            temperature=0.3,
        )
        prompt = f"""
You are a life-science sales coach. Analyse this HCP's interaction history and provide:
1. Key engagement patterns
2. Preferred topics/products
3. Overall relationship health (1-10)
4. Recommended next actions (top 3)

HCP: {hcp_name}
History:
{history}

Respond as JSON with keys: patterns, preferred_products, relationship_score, recommendations
"""
        insights = {
            "patterns": "Insufficient data",
            "preferred_products": [],
            "relationship_score": 5,
            "recommendations": ["Schedule follow-up call"],
        }
        try:
            resp = analysis_llm.invoke([HumanMessage(content=prompt)])
            text = resp.content.strip()
            if text.startswith("```"):
                text = "\n".join(text.split("\n")[1:-1])
            insights = json.loads(text)
        except Exception:
            pass

        return {"hcp_name": hcp_name, "interaction_count": len(items), **insights}

    return [log_interaction, edit_interaction, get_interaction, list_interactions, analyze_hcp_insights]


# --------------------------------------------------------------------------- #
# Build the LangGraph graph
# --------------------------------------------------------------------------- #
SYSTEM_PROMPT = """You are an intelligent CRM assistant for a life-science field representative.
You help log, retrieve, and analyse HCP (Healthcare Professional) interactions.

Available tools:
1. log_interaction     – log a new HCP visit/call/email with AI enrichment
2. edit_interaction    – edit a specific field of an existing interaction
3. get_interaction     – fetch full details of an interaction by ID
4. list_interactions   – list/search recent interactions
5. analyze_hcp_insights – AI insights & recommendations for an HCP

Always be professional, concise, and actionable. When logging interactions,
confirm back the AI-generated summary and next steps to the user.
"""


def create_agent(db: Session):
    tools = make_tools(db)
    llm_with_tools = llm.bind_tools(tools)

    def call_model(state: AgentState):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    def should_continue(state: AgentState):
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    tool_node = ToolNode(tools)

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    return graph.compile()


def run_agent(message: str, history: list, db: Session) -> dict:
    agent = create_agent(db)
    messages = []
    for h in history:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        # assistant messages are skipped to keep context clean

    messages.append(HumanMessage(content=message))

    result = agent.invoke(
        {
            "messages": messages,
            "db_session": db,
            "last_action": "",
            "interaction_data": {},
        }
    )

    final_msg = result["messages"][-1]
    response_text = final_msg.content if hasattr(final_msg, "content") else str(final_msg)

    # Extract any tool result for structured response
    tool_data = None
    action = None
    for msg in result["messages"]:
        if isinstance(msg, ToolMessage):
            try:
                tool_data = json.loads(msg.content)
                action = msg.name
            except Exception:
                pass

    return {
        "response": response_text,
        "interaction_data": tool_data,
        "action_taken": action,
    }