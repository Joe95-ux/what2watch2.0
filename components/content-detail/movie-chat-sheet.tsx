"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { MessageCircle, Send, X, Loader2, History, HelpCircle, Clock, Copy, Check, SquarePen, Trash2, Mic, MicOff, CornerDownLeft, RotateCw, Edit2, Check as CheckIcon, X as XIcon } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDistanceToNow, format } from "date-fns";
import Image from "next/image";
import { containsProfanity, sanitizeHtml } from "@/lib/moderation";

interface Message {
  role: "user" | "assistant";
  content: string;
  retryCount?: number;
  isEditing?: boolean;
  followUpSuggestions?: string[];
}

interface MovieChatSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
}

const SUGGESTIONS = [
  "Tell me about the plot",
  "Who are the main actors?",
  "Where can I watch this?",
  "What are the reviews like?",
  "Is there a sequel?",
  "What's the rating?",
];

export function MovieChatSheet({
  isOpen,
  onOpenChange,
  tmdbId,
  mediaType,
  title,
}: MovieChatSheetProps) {
  const { user } = useUser();
  const { data: currentUser } = useCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(6); // Default to 6, will be updated from API
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<Array<{
    id: string;
    sessionId: string;
    fullSessionId: string;
    title: string;
    messageCount: number;
    firstMessage: string | null;
    createdAt: string;
    updatedAt: string;
    tmdbId: number;
    mediaType: string;
  }>>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Check for Web Speech API support (Chrome, Edge, Safari) or MediaRecorder (Firefox)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasWebSpeech = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
      const hasMediaRecorder = 
        navigator.mediaDevices && 
        navigator.mediaDevices.getUserMedia && 
        typeof MediaRecorder !== "undefined";
      setIsSpeechSupported(hasWebSpeech || hasMediaRecorder);
    }
  }, []);

  // Initialize Web Speech API if available (for Chrome, Edge, Safari)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Update input with final + interim text (like ChatGPT)
      if (finalTranscript || interimTranscript) {
        setInput((prev) => {
          // Remove previous interim results and add new ones
          const baseText = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "");
          const newText = baseText + finalTranscript + (interimTranscript ? `[listening...]` : "");
          return newText.trim();
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone permission denied. Please enable it in your browser settings.");
      } else if (event.error !== "no-speech") {
        toast.error("Speech recognition error. Please try again.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Cleanup: Stop recording when component unmounts or sheet closes
  useEffect(() => {
    return () => {
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Stop recording when sheet closes
  useEffect(() => {
    if (!isOpen && isListening) {
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsListening(false);
      accumulatedTextRef.current = "";
    }
  }, [isOpen, isListening]);

  // Load chat history when sheet opens or sessionId changes
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
      shouldAutoScroll.current = true;
      // Scroll to bottom when sheet opens
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
          if (viewport) {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: "auto",
            });
          }
        }
      }, 200);
    }
  }, [isOpen, tmdbId, sessionId]);

  // Scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (shouldAutoScroll.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
      if (viewport) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, [messages, isLoading]);

  // Attach scroll listener to detect if user is near bottom
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // If user is within 100px of bottom, enable auto-scroll
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const res = await fetch(
        `/api/ai/chat/movie-details?tmdbId=${tmdbId}&sessionId=${sessionId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setQuestionCount(data.questionCount || 0);
        // Update maxQuestions from API response
        if (data.maxQuestions !== undefined) {
          setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const sendMessage = async (
    userMessageText: string,
    options: {
      isRegenerate?: boolean;
      messageIndex?: number;
      isEdit?: boolean;
    } = {}
  ) => {
    if (isLoading) return;

    const sanitizedMessage = sanitizeHtml(userMessageText);
    
    if (containsProfanity(sanitizedMessage)) {
      toast.error("Your message contains inappropriate language. Please revise your message.");
      return;
    }

    if (maxQuestions !== Infinity && questionCount >= maxQuestions && !options.isRegenerate) {
      toast.error(`You've reached your limit of ${maxQuestions} questions. Upgrade to Pro for unlimited questions.`);
      return;
    }

    setIsLoading(true);

    // Handle message updates
    let updatedMessages = [...messages];
    let userMessageIndex = updatedMessages.length;

    if (options.isEdit && options.messageIndex !== undefined) {
      // Replace the edited message
      updatedMessages[options.messageIndex] = { role: "user", content: sanitizedMessage };
      // Remove all messages after the edited one
      updatedMessages = updatedMessages.slice(0, options.messageIndex + 1);
      userMessageIndex = options.messageIndex;
    } else if (options.isRegenerate && options.messageIndex !== undefined) {
      // Remove the assistant message being regenerated and all after it
      updatedMessages = updatedMessages.slice(0, options.messageIndex);
      userMessageIndex = options.messageIndex - 1;
    } else if (!options.isRegenerate) {
      // Add new user message
      updatedMessages.push({ role: "user", content: sanitizedMessage });
      userMessageIndex = updatedMessages.length - 1;
    }

    setMessages(updatedMessages);
    if (!options.isRegenerate && !options.isEdit) {
      setInput("");
    }

    try {
      const conversationHistory = updatedMessages.slice(0, userMessageIndex);
      const lastUserMessage = updatedMessages[userMessageIndex];
      
      const res = await fetch("/api/ai/chat/movie-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastUserMessage.content,
          sessionId,
          tmdbId,
          mediaType,
          conversationHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "QUESTION_LIMIT_REACHED") {
          toast.error(data.message);
          if (data.maxQuestions !== undefined) {
            setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
          }
          setQuestionCount(data.questionCount || maxQuestions);
        } else {
          throw new Error(data.error || "Failed to send message");
        }
        return;
      }

      // Create assistant message with retry count
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        retryCount: options.isRegenerate && options.messageIndex !== undefined
          ? (updatedMessages[options.messageIndex]?.retryCount || 0) + 1
          : 0,
      };

      // Generate follow-up suggestions only if user hasn't dismissed them this session
      if (!suggestionsDismissed) {
        try {
          const suggestionsRes = await fetch("/api/ai/chat/movie-details/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lastMessage: lastUserMessage.content,
              lastResponse: assistantMessage.content,
              title,
              mediaType,
            }),
          });
          if (suggestionsRes.ok) {
            const suggestionsData = await suggestionsRes.json();
            assistantMessage.followUpSuggestions = suggestionsData.suggestions || [];
          }
        } catch (e) {
          // Silently fail suggestions
        }
      }

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (!options.isRegenerate) {
        setQuestionCount(data.questionCount || questionCount + 1);
        if (data.maxQuestions !== undefined) {
          setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
      if (!options.isRegenerate && !options.isEdit) {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend) return;
    await sendMessage(messageToSend);
  };

  const handleRegenerate = async (messageIndex: number) => {
    const message = messages[messageIndex - 1];
    if (message?.role === "user") {
      const retryCount = messages[messageIndex]?.retryCount || 0;
      if (retryCount >= 2) {
        toast.error("Maximum retries reached. Please try a different question.");
        return;
      }
      await sendMessage(message.content, { isRegenerate: true, messageIndex });
    }
  };

  const handleEditMessage = (index: number) => {
    setEditingMessageIndex(index);
    setInput(messages[index].content);
  };

  const handleSaveEdit = async () => {
    if (editingMessageIndex === null) return;
    await sendMessage(input, { isEdit: true, messageIndex: editingMessageIndex });
    setEditingMessageIndex(null);
    setInput("");
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  // Simple markdown renderer with links, bold, italic, code
  const formatMessageContent = (text: string) => {
    // Split by URLs first
    const urlRegex = /(https?:\/\/[^\s<>"'\])]+)/g;
    const parts: Array<{ type: "text" | "url"; content: string; url?: string }> = [];
    let lastIndex = 0;
    let match;
    
    urlRegex.lastIndex = 0;
    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.substring(lastIndex, match.index) });
      }
      parts.push({ type: "url", content: match[0], url: match[0] });
      lastIndex = urlRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.substring(lastIndex) });
    }
    
    if (parts.length === 0) {
      parts.push({ type: "text", content: text });
    }
    
    return parts.map((part, index) => {
      if (part.type === "url") {
        try {
          const url = new URL(part.url!);
          const displayText = url.hostname.replace('www.', '');
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline break-words overflow-wrap-anywhere"
            >
              {displayText}
            </a>
          );
        } catch {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline break-words overflow-wrap-anywhere"
            >
              {part.url}
            </a>
          );
        }
      }
      
      // Process markdown in text parts
      let content = part.content;
      const elements: React.ReactNode[] = [];
      let key = 0;
      
      // Bold: **text**
      content = content.replace(/\*\*(.+?)\*\*/g, (_, text) => {
        elements.push(<strong key={key++}>{text}</strong>);
        return `__BOLD_${elements.length - 1}__`;
      });
      
      // Italic: *text*
      content = content.replace(/\*(.+?)\*/g, (_, text) => {
        if (!text.includes('__BOLD_')) {
          elements.push(<em key={key++}>{text}</em>);
          return `__ITALIC_${elements.length - 1}__`;
        }
        return `*${text}*`;
      });
      
      // Code: `code`
      content = content.replace(/`([^`]+)`/g, (_, code) => {
        elements.push(<code key={key++} className="bg-muted px-1 py-0.5 rounded text-sm">{code}</code>);
        return `__CODE_${elements.length - 1}__`;
      });
      
      // Replace placeholders
      const parts2 = content.split(/(__BOLD_\d+__|__ITALIC_\d+__|__CODE_\d+__)/);
      return parts2.map((p, i) => {
        const match = p.match(/__(BOLD|ITALIC|CODE)_(\d+)__/);
        if (match) {
          return <React.Fragment key={i}>{elements[parseInt(match[2])]}</React.Fragment>;
        }
        return <span key={i}>{p}</span>;
      });
    });
  };

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      toast.success("Message copied to clipboard");
      setTimeout(() => {
        setCopiedMessageIndex(null);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const loadChatSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/ai/chat/movie-details/sessions?tmdbId=${tmdbId}`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.sessions || []);
      } else {
        toast.error("Failed to load chat history");
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
      toast.error("Failed to load chat history");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleHistoryClick = () => {
    setIsHistoryDialogOpen(true);
    loadChatSessions();
  };

  const handleLoadSession = async (fullSessionId: string, sessionIdPart: string) => {
    // Update the current session ID
    setSessionId(sessionIdPart);
    setSuggestionsDismissed(false);
    setIsHistoryDialogOpen(false);
    
    // Reload chat history with the new session
    try {
      const res = await fetch(
        `/api/ai/chat/movie-details?tmdbId=${tmdbId}&sessionId=${sessionIdPart}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setQuestionCount(data.questionCount || 0);
        if (data.maxQuestions !== undefined) {
          setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
        }
        toast.success("Chat session loaded");
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load chat session");
    }
  };

  const handleDeleteSession = async (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the session when clicking delete
    
    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    try {
      const res = await fetch(`/api/ai/chat/movie-details/sessions/${sessionIdToDelete}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Chat session deleted");
        
        // Check if we're deleting the current session
        const sessionToDelete = chatSessions.find(s => s.id === sessionIdToDelete);
        if (sessionToDelete && sessionToDelete.fullSessionId === `movie-details-${tmdbId}-${sessionId}`) {
          // If deleting current session, start a new chat
          handleNewChat();
        }
        
        // Reload sessions list
        loadChatSessions();
      } else {
        toast.error("Failed to delete chat session");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete chat session");
    }
  };

  const handleNewChat = () => {
    // Create a new session ID
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    setQuestionCount(0);
    setSuggestionsDismissed(false);
    setInput("");
    toast.success("New chat started");
  };

  // Transcribe audio using Whisper API (for Firefox fallback)
  const transcribeAudio = async (audioBlob: Blob, isFinal: boolean = false) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.text && data.text.trim()) {
        const transcribedText = data.text.trim();
        
        setInput((prev) => {
          // Remove the [listening...] indicator
          const baseText = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "");
          
          if (isFinal) {
            // Final transcription: append to base text
            accumulatedTextRef.current = transcribedText;
            return baseText.trim() 
              ? `${baseText.trim()} ${transcribedText}`.trim()
              : transcribedText;
          } else {
            // Periodic transcription: replace accumulated text with new full transcription
            // This provides real-time feedback
            const textWithoutAccumulated = baseText.replace(accumulatedTextRef.current, "").trim();
            accumulatedTextRef.current = transcribedText;
            return textWithoutAccumulated 
              ? `${textWithoutAccumulated} ${transcribedText} [listening...]`.trim()
              : `${transcribedText} [listening...]`;
          }
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      // Only show error for final transcription to avoid spam
      if (isFinal) {
        toast.error("Failed to transcribe audio. Please try again.");
      }
    }
  };

  const handleVoiceInput = async () => {
    if (!isSpeechSupported) {
      toast.error("Voice input is not supported in your browser");
      return;
    }

    // Check if Web Speech API is available (Chrome, Edge, Safari)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition && recognitionRef.current) {
      // Use Web Speech API for real-time transcription (like ChatGPT)
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        setInput((prev) => prev.replace(/\s*\[listening\.\.\.\]\s*$/, ""));
      } else {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          console.error("Failed to start speech recognition:", error);
          toast.error("Failed to start voice input. Please try again.");
        }
      }
    } else {
      // Fallback to MediaRecorder + Whisper for Firefox
      if (isListening) {
        // Stop periodic transcription
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current);
          transcriptionIntervalRef.current = null;
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsListening(false);
        accumulatedTextRef.current = "";
        setInput((prev) => prev.replace(/\s*\[listening\.\.\.\]\s*$/, ""));
        return;
      }

      try {
        // Reset accumulated text
        accumulatedTextRef.current = "";
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        streamRef.current = stream;

        let mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "audio/ogg";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = "";
            }
          }
        }

        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Record in chunks for periodic transcription
        const chunkDuration = 3000; // 3 seconds per chunk
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Set up periodic transcription for real-time feedback
        transcriptionIntervalRef.current = setInterval(async () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob([...audioChunksRef.current], { type: mimeType || "audio/webm" });
            // Only transcribe if we have enough audio (at least 1KB)
            if (audioBlob.size >= 1024) {
              await transcribeAudio(audioBlob, false);
            }
          }
        }, 4000); // Transcribe every 4 seconds

        mediaRecorder.onstop = async () => {
          // Clear periodic transcription
          if (transcriptionIntervalRef.current) {
            clearInterval(transcriptionIntervalRef.current);
            transcriptionIntervalRef.current = null;
          }
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          // Final transcription of all recorded audio
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
            await transcribeAudio(audioBlob, true);
            audioChunksRef.current = [];
          }

          setIsListening(false);
          accumulatedTextRef.current = "";
        };

        mediaRecorder.onerror = (event: any) => {
          console.error("MediaRecorder error:", event);
          toast.error("Recording error. Please try again.");
          setIsListening(false);
          if (transcriptionIntervalRef.current) {
            clearInterval(transcriptionIntervalRef.current);
            transcriptionIntervalRef.current = null;
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          accumulatedTextRef.current = "";
        };

        // Start recording with timeslice for chunked recording
        mediaRecorder.start(chunkDuration);
        setIsListening(true);
        setInput((prev) => prev + (prev ? " " : "") + "[listening...]");
      } catch (error: any) {
        console.error("Failed to start recording:", error);
        setIsListening(false);
        accumulatedTextRef.current = "";
        
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          toast.error("Microphone permission denied. Please enable microphone access in your browser settings.");
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          toast.error("No microphone found. Please connect a microphone and try again.");
        } else {
          toast.error("Failed to access microphone. Please try again.");
        }
      }
    }
  };

  const remainingQuestions = maxQuestions === Infinity ? Infinity : maxQuestions - questionCount;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[30rem] p-0 flex flex-col [&>button]:hidden">
        {/* Fixed Header */}
        <SheetHeader className="px-6 py-4 border-b space-y-0 flex-shrink-0">
          {/* Action Row: Quota Notice | History | Close Button */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              {remainingQuestions === Infinity 
                ? "Unlimited questions" 
                : `${remainingQuestions} ${remainingQuestions === 1 ? "question" : "questions"} left`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={handleNewChat}
                disabled={messages.length === 0}
                title="Start new chat"
              >
                <SquarePen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={handleHistoryClick}
                title="View chat history"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => onOpenChange(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Title Row */}
          <SheetTitle className="text-lg font-semibold">Ask about {title}</SheetTitle>
        </SheetHeader>

        {/* Scrollable Messages Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 min-h-0"
        >
          <div className="px-3 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Ask me anything about {title}</p>
                <p className="text-sm text-muted-foreground">
                  I can tell you about the plot, cast, where to watch, and more!
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="space-y-1">
                  <div
                    className={cn(
                      "flex items-start gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-muted border border-border">
                        <Image
                          src="/icon1.png"
                          alt="What2Watch"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2 relative group overflow-hidden",
                        message.role === "user"
                          ? "bg-[#edf3fe] text-black"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap pr-12 break-words overflow-wrap-anywhere">
                        {message.role === "assistant" ? formatMessageContent(message.content) : message.content}
                      </div>
                      <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {message.role === "user" && index === messages.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 cursor-pointer",
                              "text-black hover:bg-black/10"
                            )}
                            onClick={() => handleEditMessage(index)}
                            title="Edit message"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {message.role === "assistant" && (message.retryCount || 0) < 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 cursor-pointer",
                              "text-foreground hover:bg-foreground/10"
                            )}
                            onClick={() => handleRegenerate(index + 1)}
                            disabled={isLoading}
                            title="Regenerate response"
                          >
                            <RotateCw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6 cursor-pointer",
                            message.role === "user"
                              ? "text-black hover:bg-black/10"
                              : "text-foreground hover:bg-foreground/10"
                          )}
                          onClick={() => handleCopyMessage(message.content, index)}
                          title="Copy message"
                        >
                          {copiedMessageIndex === index ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-muted border border-border">
                        {currentUser?.avatarUrl || user?.imageUrl ? (
                          <Image
                            src={currentUser?.avatarUrl || user?.imageUrl || ""}
                            alt={currentUser?.displayName || user?.firstName || "User"}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {currentUser?.username?.[0]?.toUpperCase() || user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {message.role === "assistant" && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pl-11 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground shrink-0 order-first"
                        onClick={() => {
                          setSuggestionsDismissed(true);
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.role === "assistant" ? { ...m, followUpSuggestions: undefined } : m
                            )
                          );
                        }}
                        title="Hide suggestions"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      {message.followUpSuggestions.map((suggestion, sugIndex) => (
                        <Button
                          key={sugIndex}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-1 px-2 cursor-pointer"
                          onClick={() => handleSend(suggestion)}
                          disabled={isLoading}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-muted border border-border">
                  <Image
                    src="/icon1.png"
                    alt="What2Watch"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t bg-background">
          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="px-6 py-3 border-b">
              <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs h-8 rounded-full cursor-pointer"
                    disabled={isLoading || (maxQuestions !== Infinity && questionCount >= maxQuestions)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-6 py-4">
            {editingMessageIndex !== null && (
              <div className="mb-2 px-3 py-2 bg-muted/50 rounded-md flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Editing message</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isLoading || !input.trim()}
                    className="h-6 px-2 text-xs cursor-pointer"
                  >
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="h-6 px-2 text-xs cursor-pointer"
                  >
                    <XIcon className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <div className="relative rounded-lg border border-border bg-background">
              <div className="flex items-end gap-2 p-2">
                <Input
                  value={input}
                  onChange={(e) => {
                    // Sanitize input on change (no trim so spaces while typing are preserved)
                    const sanitized = sanitizeHtml(e.target.value, { trim: false });
                    setInput(sanitized);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (editingMessageIndex !== null) {
                        handleSaveEdit();
                      } else {
                        handleSend();
                      }
                    }
                    if (e.key === "Escape" && editingMessageIndex !== null) {
                      handleCancelEdit();
                    }
                  }}
                  placeholder={
                    editingMessageIndex !== null
                      ? "Edit your message..."
                      : maxQuestions !== Infinity && questionCount >= maxQuestions
                      ? "Upgrade to Pro for more questions"
                      : "Ask a question..."
                  }
                  disabled={isLoading || (questionCount >= maxQuestions && editingMessageIndex === null)}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent resize-none min-h-[44px] max-h-[200px] placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1 pb-1">
                  <Button
                    onClick={handleVoiceInput}
                    disabled={isLoading || questionCount >= maxQuestions || !isSpeechSupported}
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 cursor-pointer shrink-0",
                      isListening && "text-destructive animate-pulse"
                    )}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading || questionCount >= maxQuestions}
                    size="icon"
                    className="h-8 w-8 cursor-pointer shrink-0"
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CornerDownLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            {questionCount >= maxQuestions && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                You've reached your question limit. Upgrade to Pro for unlimited questions.
              </p>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Chat History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] min-h-0 max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chat History for {title}</DialogTitle>
            <DialogDescription>
              Select a previous conversation to continue
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 -mx-6 px-6 overflow-y-auto scrollbar-thin">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No chat history found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start a conversation to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="w-full p-4 rounded-lg border border-border hover:bg-muted transition-colors group relative"
                  >
                    <button
                      onClick={() => handleLoadSession(session.fullSessionId, session.sessionId)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <History className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {session.title}
                        </span>
                      </div>
                      {session.firstMessage && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2 pr-10">
                          {session.firstMessage}
                          {session.firstMessage.length >= 100 ? "..." : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {session.messageCount} {session.messageCount === 1 ? "message" : "messages"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(session.updatedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete chat session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
