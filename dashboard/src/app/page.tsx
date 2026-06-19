"use client";

import { useState } from 'react';
import { Terminal, ShieldCheck, Zap, Cpu, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInstall = async () => {
    setLoading(true);
    setLogs(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/install', { method: 'POST' });
      const data = await response.json();
      
      setLogs(data.log);
      if (data.success) {
        setSuccess(true);
      }
    } catch (error) {
      setLogs("Falha crítica ao contactar o servidor local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-purple-500/30 font-sans flex flex-col items-center py-20 px-6 relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full flex flex-col items-center text-center mb-16 z-10"
      >
        <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 mb-6">
          <Terminal className="w-12 h-12 text-purple-400" />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-white via-slate-200 to-purple-400 text-transparent bg-clip-text">
          TokTrim
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
          Token Economy & Context Engineering Stack. <br/>
          Reduza em até 90% o consumo de tokens da sua IA cortando ruídos de logs e mapeando ast sem ler os arquivos integrais.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 z-10"
      >
        {[
          { icon: <Zap className="text-yellow-400" />, title: "RTK & Repomix", desc: "Rust Token Killer CLI e geradores de Mapas AST nativos." },
          { icon: <Cpu className="text-blue-400" />, title: "Headroom Engine", desc: "Compressão neural de logs complexos em tempo real." },
          { icon: <ShieldCheck className="text-emerald-400" />, title: "Multi-Agent Auth", desc: "Regras plug-and-play para Google Antigravity e Claude Code." },
          { icon: <Terminal className="text-purple-400" />, title: "Codebase Graph", desc: "Servidor Neo4j MCP Tools para rastrear dependências sem ler os arquivos." }
        ].map((feature, i) => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/50 hover:border-purple-500/30 transition-all duration-300">
            <div className="p-3 bg-slate-800 rounded-xl w-fit mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Control Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-3xl w-full bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 md:p-12 z-10 shadow-2xl flex flex-col items-center"
      >
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          Painel de Instalação Global
        </h2>

        {!loading && !success && (
          <button 
            onClick={handleInstall}
            className="group relative px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-[0_0_40px_8px_rgba(168,85,247,0.4)] overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-3">
              Deploy TokTrim Stack <Terminal className="w-5 h-5" />
            </span>
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">Compilando motores em Rust e injetando regras...</p>
          </div>
        )}

        {success && (
          <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            className="flex flex-col items-center gap-4 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-full"
          >
            <CheckCircle className="w-16 h-16 text-emerald-400 mb-2" />
            <h3 className="text-2xl font-bold text-emerald-400">Instalação Concluída!</h3>
            <p className="text-emerald-200/70 text-center">O TokTrim foi injetado com sucesso no seu ambiente. Todas as IAs agora operarão em modo Hyperdrive.</p>
          </motion.div>
        )}

        <AnimatePresence>
          {logs && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="w-full mt-10 overflow-hidden"
            >
              <div className="bg-black/50 border border-slate-800 rounded-xl p-6 relative">
                <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black/80 to-transparent flex items-center px-4 border-b border-slate-800/50">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-4 text-xs text-slate-500 font-mono">install.sh</span>
                </div>
                <pre className="mt-8 font-mono text-xs md:text-sm text-emerald-400/80 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
                  {logs}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
