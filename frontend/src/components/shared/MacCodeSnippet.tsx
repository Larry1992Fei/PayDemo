import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type CodeSection = {
  title: string;
  endpoint?: { method: string; url: string };
  requestBody?: string;
  responseBody?: string;
};

interface MacCodeSnippetProps {
  codeString?: string;
  endpoint?: { method: string; url: string };
  requestBody?: string;
  responseBody?: string;
  sections?: CodeSection[];
  filename?: string;
  flashTrigger?: number;
  className?: string;
  onExecute?: () => void;
  isExecuteDisabled?: boolean;
  emptyMessage?: string;
}

export const MacCodeSnippet: React.FC<MacCodeSnippetProps> = ({
  codeString,
  endpoint,
  requestBody,
  responseBody,
  sections,
  filename = 'index.ts',
  flashTrigger = 0,
  className,
  onExecute,
  isExecuteDisabled,
  emptyMessage,
}) => {
  const { t } = useLanguage();
  const [isFlashing, setIsFlashing] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const finalRequest = requestBody || codeString || '';
  const displaySections: CodeSection[] = sections?.length
    ? sections
    : finalRequest || responseBody || endpoint
      ? [{ title: 'API Request', endpoint, requestBody: finalRequest, responseBody }]
      : [];
  const hasContent = displaySections.length > 0;

  React.useEffect(() => {
    if (flashTrigger <= 0) return undefined;

    setIsFlashing(true);
    const timer = window.setTimeout(() => setIsFlashing(false), 500);
    return () => window.clearTimeout(timer);
  }, [flashTrigger]);

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1400);
  };

  const highlightJson = (jsonStr: string) => {
    try {
      const formattedJson = JSON.stringify(JSON.parse(jsonStr), null, 2);
      return formattedJson
        .replace(/"([^"]+)"\s*:/g, '<span style="color: #7DD3FC;">$&</span>')
        .replace(/:"([^"]+)"/g, ':<span style="color: #86EFAC;">$&</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color: #FCD34D;">$&</span>')
        .replace(/\b(true|false|null)\b/g, '<span style="color: #F9A8D4;">$&</span>');
    } catch {
      return jsonStr;
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[14px] leading-[1.5] shadow-2xl border border-white/10 relative transition-all duration-500 flex flex-col w-full',
        isFlashing && 'shadow-[0_0_30px_rgba(79,70,229,0.4)] border-indigo-500/50',
        className
      )}
    >
      <div className="flex items-center px-4 h-10 bg-[#2d2d2d] border-b border-white/5 shrink-0">
        <div className="flex gap-1.5 shrink-0 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <div className="w-full text-center text-[#858585] text-[10px] font-bold -ml-10 tracking-widest font-sans uppercase">
          {filename}
        </div>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {!hasContent && (
          <div className="h-full min-h-[360px] flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 h-10 w-10 rounded-xl bg-slate-800/70 border border-white/10 flex items-center justify-center text-slate-500">
                <Play className="w-4 h-4" />
              </div>
              <p className="text-[13px] leading-6 text-slate-400 font-sans">{emptyMessage || t('code.empty')}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-slate-600 font-bold">
                Waiting for real exchange
              </p>
            </div>
          </div>
        )}

        {displaySections.map((section, index) => {
          const requestKey = `${index}-request`;
          const responseKey = `${index}-response`;
          const sectionRequest = section.requestBody || '';

          return (
            <div key={`${section.title}-${index}`} className="divide-y divide-white/5">
              <div className="px-5 py-3 bg-[#252526] flex items-center gap-4 min-w-0">
                <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {section.title}
                </span>
                {section.endpoint && (
                  <div className="min-w-0 flex flex-1 items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-tight">
                      {section.endpoint.method}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                      {section.endpoint.url}
                    </span>
                  </div>
                )}
              </div>

              {sectionRequest && (
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Request Body
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-600">Application/JSON</span>
                      <button
                        onClick={() => copyToClipboard(sectionRequest, requestKey)}
                        className="p-1 rounded-md bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === requestKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className={cn('transition-opacity duration-300', isFlashing && 'opacity-70')}>
                    <pre className="whitespace-pre-wrap break-words font-mono text-sm text-[#d4d4d4]">
                      <code dangerouslySetInnerHTML={{ __html: highlightJson(sectionRequest) }} />
                    </pre>
                  </div>
                </div>
              )}

              {section.responseBody && (
                <div className="p-5 space-y-2 bg-indigo-500/[0.02] animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-widest">
                      Response Body
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">200 OK</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(section.responseBody || '', responseKey)}
                        className="p-1 rounded-md bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === responseKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-[#d4d4d4]">
                    <code dangerouslySetInnerHTML={{ __html: highlightJson(section.responseBody) }} />
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onExecute && (
        <div className="shrink-0 h-11 bg-[#252526] border-t border-white/5 flex items-center justify-end px-4 gap-4">
          <span className="text-[9px] text-slate-600 font-bold tracking-widest uppercase items-center flex gap-1 animate-pulse">
            <div className="w-1 h-1 rounded-full bg-indigo-500" /> Ready to transmit
          </span>
          <button
            onClick={onExecute}
            disabled={isExecuteDisabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all',
              isExecuteDisabled
                ? 'text-[#666] bg-[#333] cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer'
            )}
          >
            {isExecuteDisabled ? 'DONE' : 'RUN REQUEST'}
            {!isExecuteDisabled && <Play className="w-3 h-3 fill-current" />}
          </button>
        </div>
      )}
    </div>
  );
};
