import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Shield,
  FileText,
  Lock,
  Camera,
  RefreshCw,
  HelpCircle,
  Minimize2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

const STARTER_PROMPTS = [
  'How do I pair my phone with my laptop?',
  'How does PDF to Word conversion work?',
  'Why is my payment pending admin approval?',
  'What are the advantages of End-to-End Encryption?',
  'How do I watermark sensitive files?',
];

interface BeamDropAIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConverter?: () => void;
  onOpenWatermark?: () => void;
  onOpenPayment?: () => void;
  onOpenScanner?: () => void;
}

export const BeamDropAIChatbot: React.FC<BeamDropAIChatbotProps> = ({
  isOpen,
  onClose,
  onOpenConverter,
  onOpenWatermark,
  onOpenPayment,
  onOpenScanner,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'bot',
      text: "Hello! I am **BeamDrop AI Assistant**.\n\nI am exclusively dedicated to helping you with this website: **peer-to-peer file transfers, QR pairing, document format conversion (PDF ⇄ Word/Text/Image), universal watermarking, and zero-knowledge encryption**.\n\nHow can I help you use BeamDrop today?",
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const data = await response.json();
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'I am here to help you with BeamDrop features and tools.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: "BeamDrop enables direct P2P transfers via WebRTC. You can scan the QR code to connect devices, convert PDFs to Word/Text/Images with the Format Converter, watermark sensitive files, and unlock lifetime zero-knowledge encryption.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatBotText = (text: string) => {
    // Process markdown-like formatting (bold, headers, bullets)
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Header ###
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-neutral-900 dark:text-white mt-2 mb-1 text-xs sm:text-sm">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Bullet list item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const cleanContent = line.replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-neutral-700 dark:text-neutral-300 my-0.5 text-xs">
            {renderFormattedInline(cleanContent)}
          </li>
        );
      }
      // Numbered list item
      if (/^\d+\.\s+/.test(line)) {
        return (
          <li key={idx} className="ml-4 list-decimal text-neutral-700 dark:text-neutral-300 my-0.5 text-xs">
            {renderFormattedInline(line.replace(/^\d+\.\s+/, ''))}
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Standard paragraph
      return (
        <p key={idx} className="text-neutral-700 dark:text-neutral-300 my-0.5 text-xs leading-relaxed">
          {renderFormattedInline(line)}
        </p>
      );
    });
  };

  const renderFormattedInline = (str: string) => {
    // Replace **bold** with <strong>
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-bold text-neutral-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Code backticks `code`
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} className="rounded bg-neutral-200/80 px-1 py-0.2 font-mono text-[11px] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end animate-fade-in font-sans">
      {/* Minimized Chip */}
      {isMinimized ? (
        <div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white p-2.5 shadow-2xl dark:border-indigo-900/60 dark:bg-neutral-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-left pr-2 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>BeamDrop AI Assistant</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-neutral-500">Click to expand chat</div>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Full Chatbot Window */
        <div className="relative flex flex-col w-[92vw] sm:w-[410px] h-[550px] max-h-[85vh] rounded-3xl border border-neutral-200/90 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                    BeamDrop AI Assistant
                  </h3>
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Website Only
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Interactive Guide · Kaif Khan</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize chat"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close assistant"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Banner */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50/50 border-b border-indigo-100/60 dark:bg-indigo-950/30 dark:border-indigo-900/30 overflow-x-auto text-[11px]">
            {onOpenConverter && (
              <button
                onClick={onOpenConverter}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 whitespace-nowrap border border-neutral-200 dark:border-neutral-700"
              >
                <FileText className="h-3 w-3 text-indigo-500" />
                <span>Format Converter</span>
              </button>
            )}
            {onOpenWatermark && (
              <button
                onClick={onOpenWatermark}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 whitespace-nowrap border border-neutral-200 dark:border-neutral-700"
              >
                <Shield className="h-3 w-3 text-amber-500" />
                <span>Watermarking</span>
              </button>
            )}
            {onOpenPayment && (
              <button
                onClick={onOpenPayment}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 whitespace-nowrap border border-neutral-200 dark:border-neutral-700"
              >
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>E2EE License</span>
              </button>
            )}
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 whitespace-nowrap border border-neutral-200 dark:border-neutral-700"
              >
                <Camera className="h-3 w-3 text-purple-500" />
                <span>Camera Scan</span>
              </button>
            )}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-neutral-900 text-white rounded-br-xs dark:bg-white dark:text-neutral-950 font-medium'
                      : 'bg-neutral-100 text-neutral-800 rounded-bl-xs dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200/50 dark:border-neutral-700/50'
                  }`}
                >
                  {m.sender === 'user' ? m.text : formatBotText(m.text)}
                </div>

                {m.sender === 'user' && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-neutral-400 pl-9">
                <span className="flex gap-1 items-center bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                </span>
                <span className="text-[11px] italic">BeamDrop AI is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Prompts */}
          <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 shrink-0">
            <div className="text-[10px] font-semibold text-neutral-400 mb-1 flex items-center gap-1">
              <HelpCircle className="h-2.5 w-2.5" />
              <span>Suggested questions:</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-indigo-500 whitespace-nowrap transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about BeamDrop..."
                className="w-full rounded-2xl border border-neutral-300 bg-white py-2.5 pl-3.5 pr-11 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                className="absolute right-1.5 rounded-xl bg-neutral-900 p-2 text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[10px] text-center text-neutral-400">
              Only answers questions about this website. Zero cloud storage transfers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
