import React, { useEffect, useState } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "./store";
import {
  fetchInteractions,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  sendChat,
  setMode,
  setSelected,
  addChatMessage,
  clearChat,
} from "./store/interactionsSlice";

/* ─── Google Fonts + Global Styles ──────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #0a0d14;
      --surface:  #111827;
      --surface2: #1c2434;
      --border:   #2a3447;
      --accent:   #3b82f6;
      --accent2:  #10b981;
      --danger:   #ef4444;
      --warn:     #f59e0b;
      --text:     #e2e8f0;
      --muted:    #64748b;
      --radius:   12px;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--surface); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    button { font-family: 'Inter', sans-serif; cursor: pointer; border: none; }
    input, textarea, select { font-family: 'Inter', sans-serif; }

    .fade-in {
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}</style>
);

/* ─── Sentiment Badge ────────────────────────────────────────────────────── */
const Badge = ({ val }) => {
  const map = { positive: ["#10b981","Positive"], neutral: ["#f59e0b","Neutral"], negative: ["#ef4444","Negative"] };
  const [color, label] = map[val] || ["#64748b", val || "—"];
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: ".5px"
    }}>{label}</span>
  );
};

/* ─── Interaction Card ───────────────────────────────────────────────────── */
const InteractionCard = ({ item, onEdit, onDelete }) => (
  <div className="fade-in" style={{
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 12,
    transition: "border-color .2s",
  }}
    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{item.hcp_name}</div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
          {item.hcp_specialty || "—"} · {item.hcp_institution || "—"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Badge val={item.sentiment} />
        <TypePill type={item.interaction_type} />
      </div>
    </div>
    {item.summary && (
      <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 }}>{item.summary}</p>
    )}
    {item.next_steps && (
      <div style={{ fontSize: 12, color: "var(--accent2)", background: "#10b98111", borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
        📌 {item.next_steps}
      </div>
    )}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>
        {item.interaction_date ? new Date(item.interaction_date).toLocaleDateString() : "—"}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onEdit(item)} style={btnSm("#2563eb")}>Edit</button>
        <button onClick={() => onDelete(item.id)} style={btnSm("#dc2626")}>Delete</button>
      </div>
    </div>
  </div>
);

const TypePill = ({ type }) => {
  const map = { visit: "#6366f1", call: "#0ea5e9", email: "#f59e0b", conference: "#10b981" };
  const color = map[type] || "#64748b";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, textTransform: "capitalize"
    }}>{type || "visit"}</span>
  );
};

const btnSm = (bg) => ({
  background: bg + "22", color: bg, border: `1px solid ${bg}44`,
  borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 500
});

/* ─── Form Mode ──────────────────────────────────────────────────────────── */
const FormMode = ({ editItem, onCancel }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    hcp_name: "", hcp_specialty: "", hcp_institution: "",
    interaction_type: "visit", interaction_date: "",
    products_discussed: [], summary: "", next_steps: "",
    sentiment: "neutral", raw_notes: "",
  });
  const [productInput, setProductInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        ...editItem,
        interaction_date: editItem.interaction_date
          ? editItem.interaction_date.slice(0, 10) : "",
        products_discussed: editItem.products_discussed || [],
      });
    }
  }, [editItem]);

  const inp = (field) => ({
    value: form[field] || "",
    onChange: (e) => setForm(f => ({ ...f, [field]: e.target.value })),
    style: inputStyle,
  });

  const handleSubmit = async () => {
    if (!form.hcp_name.trim()) return;
    setSaving(true);
    const payload = { ...form };
    if (editItem) {
      await dispatch(updateInteraction({ id: editItem.id, payload }));
    } else {
      await dispatch(createInteraction(payload));
    }
    setSaving(false);
    dispatch(fetchInteractions());
    onCancel();
  };

  const addProduct = () => {
    if (!productInput.trim()) return;
    setForm(f => ({ ...f, products_discussed: [...(f.products_discussed || []), productInput.trim()] }));
    setProductInput("");
  };

  return (
    <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 28, border: "1px solid var(--border)" }}>
      <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>
        {editItem ? "✏️ Edit Interaction" : "📋 Log New Interaction"}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="HCP Name *"><input placeholder="Dr. Sarah Chen" {...inp("hcp_name")} /></Field>
        <Field label="Specialty"><input placeholder="Oncologist" {...inp("hcp_specialty")} /></Field>
        <Field label="Institution"><input placeholder="Apollo Hospitals" {...inp("hcp_institution")} /></Field>
        <Field label="Type">
          <select {...inp("interaction_type")} style={inputStyle}>
            {["visit","call","email","conference"].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" {...inp("interaction_date")} /></Field>
        <Field label="Sentiment">
          <select {...inp("sentiment")} style={inputStyle}>
            {["positive","neutral","negative"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Products Discussed" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={productInput} onChange={e => setProductInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addProduct()}
            placeholder="Type product name and press Enter" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addProduct} style={{ background: "var(--accent)", color: "#fff", borderRadius: 8, padding: "0 16px", fontWeight: 600 }}>+</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {(form.products_discussed || []).map((p, i) => (
            <span key={i} style={{ background: "#3b82f622", color: "var(--accent)", border: "1px solid #3b82f644", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>
              {p}
              <button onClick={() => setForm(f => ({ ...f, products_discussed: f.products_discussed.filter((_, j) => j !== i) }))}
                style={{ background: "none", color: "var(--muted)", marginLeft: 6, padding: 0, fontSize: 12 }}>×</button>
            </span>
          ))}
        </div>
      </Field>

      <Field label="Raw Notes" style={{ marginTop: 14 }}>
        <textarea rows={4} placeholder="Describe what happened during the interaction..." {...inp("raw_notes")} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      {!editItem && (
        <div style={{ background: "#3b82f611", border: "1px solid #3b82f633", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 12, color: "#93c5fd" }}>
          🤖 AI will auto-generate summary, next steps & sentiment from your raw notes.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={handleSubmit} disabled={saving} style={{
          background: saving ? "var(--border)" : "var(--accent)", color: "#fff",
          borderRadius: 10, padding: "10px 24px", fontWeight: 600, fontSize: 14,
          opacity: saving ? .6 : 1, flex: 1
        }}>
          {saving ? "Saving…" : editItem ? "Update Interaction" : "Log Interaction"}
        </button>
        <button onClick={onCancel} style={{ background: "var(--surface2)", color: "var(--text)", borderRadius: 10, padding: "10px 20px", fontSize: 14 }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, children, style }) => (
  <div style={style}>
    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 6, display: "block" }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 13,
  outline: "none",
};

/* ─── Chat Mode ──────────────────────────────────────────────────────────── */
const ChatMode = () => {
  const dispatch = useDispatch();
  const { chatMessages, chatLoading } = useSelector(s => s.interactions);
  const [input, setInput] = useState("");
  const endRef = React.useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || chatLoading) return;
    setInput("");
    dispatch(addChatMessage({ role: "user", content: msg }));
    await dispatch(sendChat({
      message: msg,
      history: chatMessages.map(m => ({ role: m.role, content: m.content })),
    }));
    dispatch(fetchInteractions());
  };

  const suggestions = [
    "Log a visit with Dr. Priya Sharma at Fortis – she showed interest in Oncogen and asked for comparative data. Mood was positive.",
    "Show me all interactions with Dr. Kumar",
    "Analyze HCP insights for Dr. Priya Sharma",
    "Edit interaction 1 – change sentiment to positive",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {chatMessages.length === 0 && (
        <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>CRM AI Assistant</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Powered by LangGraph + Groq gemma2-9b-it</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 640 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setInput(s)} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 12, textAlign: "left",
                lineHeight: 1.5, transition: "border-color .2s"
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {chatMessages.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {chatMessages.map((m, i) => (
            <div key={i} className="fade-in" style={{
              display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start"
            }}>
              <div style={{
                maxWidth: "75%", background: m.role === "user" ? "var(--accent)" : "var(--surface2)",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "12px 16px", fontSize: 13, lineHeight: 1.6,
                border: m.role === "assistant" ? "1px solid var(--border)" : "none"
              }}>
                {m.content}
                {m.data && (
                  <div style={{ marginTop: 10, background: "#10b98111", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--accent2)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>🗂 Data captured:</div>
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{JSON.stringify(m.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: "flex", gap: 6, padding: "8px 12px" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: `pulse 1.2s ${i*0.2}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Describe an HCP interaction or ask the agent anything… (Enter to send)"
          rows={2}
          style={{
            ...inputStyle, flex: 1, resize: "none", lineHeight: 1.5, padding: "10px 14px"
          }} />
        <button onClick={send} disabled={chatLoading || !input.trim()} style={{
          background: "var(--accent)", color: "#fff", borderRadius: 10,
          padding: "10px 20px", fontWeight: 600, fontSize: 14,
          opacity: chatLoading || !input.trim() ? .5 : 1,
          minWidth: 72, height: 44
        }}>Send</button>
      </div>
    </div>
  );
};

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
const Sidebar = ({ onNewForm, onEdit }) => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.interactions);
  const [search, setSearch] = useState("");

  useEffect(() => { dispatch(fetchInteractions(search)); }, [search]);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this interaction?")) {
      await dispatch(deleteInteraction(id));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search HCP…"
          style={{ ...inputStyle, flex: 1 }} />
        <button onClick={onNewForm} style={{
          background: "var(--accent)", color: "#fff", borderRadius: 8,
          padding: "0 14px", fontWeight: 600, whiteSpace: "nowrap", fontSize: 13
        }}>+ Log</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && <div style={{ color: "var(--muted)", textAlign: "center", padding: 24, fontSize: 13 }}>Loading…</div>}
        {!loading && list.length === 0 && (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: 40, fontSize: 13 }}>
            No interactions yet.<br />Log one using the form or chat!
          </div>
        )}
        {list.map(item => (
          <InteractionCard key={item.id} item={item} onEdit={onEdit} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};

/* ─── Main App ───────────────────────────────────────────────────────────── */
const CRMApp = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector(s => s.interactions);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => { dispatch(fetchInteractions()); }, []);

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditItem(null); };

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* Left Panel */}
        <div style={{
          width: 340, minWidth: 300, background: "var(--surface)",
          borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
          padding: 16, gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>HCP CRM</div>
              <div style={{ color: "var(--muted)", fontSize: 11 }}>Life Sciences Field Rep</div>
            </div>
          </div>
          <Sidebar onNewForm={() => { setShowForm(true); setEditItem(null); }} onEdit={handleEdit} />
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{
            padding: "16px 24px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)"
          }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>Log Interaction</h1>
              <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                {mode === "form" ? "Structured form entry" : "Conversational AI agent"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 10, padding: 4 }}>
              {["form", "chat"].map(m => (
                <button key={m} onClick={() => dispatch(setMode(m))} style={{
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                  borderRadius: 8, padding: "6px 18px", fontSize: 13, fontWeight: 600,
                  transition: "all .2s", textTransform: "capitalize"
                }}>{m === "form" ? "📋 Form" : "🤖 Chat"}</button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "hidden", padding: 24, display: "flex", flexDirection: "column" }}>
            {mode === "form" ? (
              showForm ? (
                <FormMode editItem={editItem} onCancel={handleCancel} />
              ) : (
                <div className="fade-in" style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center", gap: 16
                }}>
                  <div style={{ fontSize: 48 }}>📋</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>Structured Form Entry</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", maxWidth: 380 }}>
                    Use the structured form to log detailed HCP interaction data.<br />
                    AI will auto-enrich your notes with summaries and next steps.
                  </div>
                  <button onClick={() => setShowForm(true)} style={{
                    background: "var(--accent)", color: "#fff", borderRadius: 12,
                    padding: "12px 28px", fontSize: 14, fontWeight: 600, marginTop: 8
                  }}>Log New Interaction</button>
                </div>
              )
            ) : (
              <ChatMode />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <CRMApp />
    </Provider>
  );
}
