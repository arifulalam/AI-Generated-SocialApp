import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  activeChat: null,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.activeChat = null;
      state.error = null;
    },
  },
});

export const {
  setMessages,
  addMessage,
  setActiveChat,
  setLoading,
  setError,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
