import React, { useEffect, useRef } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ArrowRight, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

export const StepMandateBound: React.FC = () => {
  const {
    subMode,
    mandateTokenId,
    mandateBindOrderNo,
    lastApiResponse,
    isApiCalling,
    queryMandateBindingStatus,
    goNext,
    deductWithMandateToken,
  } = useSubscription();

  const queriedRef = useRef(false);
  const stepId = subMode === 'nonperiodic' ? 'np-bound' : 'm-bound';

  useEffect(() => {
    if (queriedRef.current) return;
    queriedRef.current = true;
    void queryMandateBindingStatus(stepId).catch(error => console.error(error));
  }, [queryMandateBindingStatus, stepId]);

  const queryStatus = lastApiResponse?.debug?.responseFromPayerMax?.data?.status
    || lastApiResponse?.data?.status
    || lastApiResponse?.code
    || 'QUERYING';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="bg-white px-5 py-4 border-b border-slate-100">
        <h3 className="text-[15px] font-black text-slate-900">完成支付绑定</h3>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5">orderQuery · verify binding result</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="rounded-3xl bg-emerald-500 text-white p-5 text-center shadow-xl shadow-emerald-100">
          <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            {isApiCalling ? <Loader2 className="w-8 h-8 animate-spin" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <h4 className="text-xl font-black">绑定结果已确认</h4>
          <p className="text-xs font-semibold text-white/85 leading-relaxed mt-2">
            已通过 orderQuery 查询首次绑定订单结果。商户需要保管 paymentTokenID，用于后续订阅扣款或按需代扣。
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">paymentTokenID</p>
              <p className="text-xs font-mono text-slate-800 mt-1 break-all">
                {mandateTokenId || '等待 orderQuery 返回 paymentTokenID'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Info label="Query Status" value={queryStatus} />
            <Info label="Bind Order" value={mandateBindOrderNo || '等待首次绑定订单号'} />
          </div>
        </div>


      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <button
          type="button"
          onClick={async () => {
            goNext();
            await deductWithMandateToken(subMode === 'nonperiodic' ? 'np-deduct' : 'm-deduct');
          }}
          disabled={isApiCalling}
          className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
        >
          {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          进入后续扣款
        </button>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0">
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
    <div className="text-[12px] font-black text-slate-800 mt-1 truncate">{value}</div>
  </div>
);
