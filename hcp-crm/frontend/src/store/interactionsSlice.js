import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export const fetchInteractions = createAsyncThunk(
  "interactions/fetchAll",
  async (hcpName = "") => {
    const params = hcpName ? { hcp_name: hcpName } : {};
    const res = await axios.get(`${API}/interactions/`, { params });
    return res.data;
  }
);

export const createInteraction = createAsyncThunk(
  "interactions/create",
  async (payload) => {
    const res = await axios.post(`${API}/interactions/`, payload);
    return res.data;
  }
);

export const updateInteraction = createAsyncThunk(
  "interactions/update",
  async ({ id, payload }) => {
    const res = await axios.put(`${API}/interactions/${id}`, payload);
    return res.data;
  }
);

export const deleteInteraction = createAsyncThunk(
  "interactions/delete",
  async (id) => {
    await axios.delete(`${API}/interactions/${id}`);
    return id;
  }
);

export const sendChat = createAsyncThunk("interactions/chat", async ({ message, history }) => {
  const res = await axios.post(`${API}/chat/`, {
    message,
    conversation_history: history,
  });
  return res.data;
});

const interactionsSlice = createSlice({
  name: "interactions",
  initialState: {
    list: [],
    loading: false,
    error: null,
    chatMessages: [],
    chatLoading: false,
    selectedInteraction: null,
    mode: "form", // 'form' | 'chat'
  },
  reducers: {
    setMode: (state, action) => { state.mode = action.payload; },
    setSelected: (state, action) => { state.selectedInteraction = action.payload; },
    clearError: (state) => { state.error = null; },
    addChatMessage: (state, action) => { state.chatMessages.push(action.payload); },
    clearChat: (state) => { state.chatMessages = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (s) => { s.loading = true; })
      .addCase(fetchInteractions.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchInteractions.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(createInteraction.fulfilled, (s, a) => { s.list.unshift(a.payload); })
      .addCase(updateInteraction.fulfilled, (s, a) => {
        const idx = s.list.findIndex((i) => i.id === a.payload.id);
        if (idx !== -1) s.list[idx] = a.payload;
      })
      .addCase(deleteInteraction.fulfilled, (s, a) => {
        s.list = s.list.filter((i) => i.id !== a.payload);
      })

      .addCase(sendChat.pending, (s) => { s.chatLoading = true; })
      .addCase(sendChat.fulfilled, (s, a) => {
        s.chatLoading = false;
        s.chatMessages.push({ role: "assistant", content: a.payload.response, data: a.payload.interaction_data });
        if (a.payload.interaction_data && a.payload.action_taken === "log_interaction") {
          // refresh list on successful log
        }
      })
      .addCase(sendChat.rejected, (s) => { s.chatLoading = false; });
  },
});

export const { setMode, setSelected, clearError, addChatMessage, clearChat } = interactionsSlice.actions;
export default interactionsSlice.reducer;
