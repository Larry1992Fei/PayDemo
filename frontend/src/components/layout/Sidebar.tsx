import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  SUB_MODE_CONFIG, INTEGRATION_CONFIG, PAYMENT_METHOD_CONFIG,
  type SubMode, type IntegrationMode, type PaymentMethod
} from '@/types/subscription';
import { PAYMENT_INTEGRATION_CONFIG, type PaymentIntegrationMode } from '@/types/payment';
import { LINK_MODE_CONFIG, type LinkMode } from '@/types/link';
import { SettingSelector, type Option } from '@/components/shared/SettingSelector';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const { productMode } = useProduct();
  const isSubscriptionMode = productMode === 'SUBSCRIPTION';

  return (
    <aside className="w-[280px] min-w-[280px] h-full bg-white border-r border-slate-200/80 shadow-[2px_0_10px_-3px_rgba(0,0,0,0.03)] flex flex-col z-20 overflow-y-auto hidden lg:flex">
      <div className="px-6 py-5 flex-1">
        <h2 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-5">
          {isSubscriptionMode ? 'Subscription Config' : 'Payment Configuration'}
        </h2>

        {productMode === 'SUBSCRIPTION' ? (
          <SubscriptionSidebar />
        ) : productMode === 'STANDARD' ? (
          <StandardSidebar />
        ) : productMode === 'PAYMENT_LINK' ? (
          <LinkSidebar />
        ) : (
          <DefaultSidebar />
        )}
      </div>
    </aside>
  );
};

// ── 订阅代扣专属配置面板 ────────────────────────────────────────────────────────
const SubscriptionSidebar: React.FC = () => {
  const {
    subMode, integrationMode, paymentMethod,
    setSubMode, setIntegrationMode, setPaymentMethod, reset
  } = useSubscription();

  // 转换数据为组件需要格式
  const subModeOptions: Option[] = (Object.keys(SUB_MODE_CONFIG) as SubMode[]).map(key => ({
    id: key, 
    label: SUB_MODE_CONFIG[key].name, 
    desc: SUB_MODE_CONFIG[key].desc 
  }));

  const integrationOptions: Option[] = (Object.keys(INTEGRATION_CONFIG) as IntegrationMode[]).map(key => ({
    id: key, 
    label: INTEGRATION_CONFIG[key].label 
  }));

  const methodOptions: Option[] = [
    ...(integrationMode === 'cashier'
      ? [{ id: '', label: '全部收银台' }]
      : []),
    ...(Object.keys(PAYMENT_METHOD_CONFIG) as PaymentMethod[]).map(key => ({
    id: key, 
    label: PAYMENT_METHOD_CONFIG[key].label 
    })),
  ];

  return (
    <div className="space-y-7">
      {/* 业务模式 */}
      <section className="space-y-2">
        <SectionTitle>业务模式</SectionTitle>
        <SettingSelector 
          options={subModeOptions} 
          value={subMode} 
          onChange={(id) => setSubMode(id as SubMode)} 
          type="card"
        />
      </section>

      {/* 集成方式 */}
      <section className="space-y-2 pt-5 border-t border-slate-100">
        <SectionTitle>集成方式</SectionTitle>
        <SettingSelector 
          options={integrationOptions} 
          value={integrationMode} 
          onChange={(id) => setIntegrationMode(id as IntegrationMode)} 
          type="radio"
          name="subIntegrationMode"
        />
      </section>

      {/* 支付方式 */}
      <section className="space-y-2 pt-5 border-t border-slate-100">
        <SectionTitle>支付方式</SectionTitle>
        <SettingSelector 
          options={methodOptions} 
          value={paymentMethod} 
          onChange={(id) => setPaymentMethod(id as PaymentMethod)} 
          type="radio"
          name="subPaymentMethod"
        />

        {/* APM 特殊说明 */}
        {paymentMethod === 'apm' && (
          <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed font-semibold">
            APM 订阅激活传 ONE_TOUCH，并默认 targetOrg: KAKAOPAY。<br />
            当前演示已固定使用 KR / KRW。
          </div>
        )}
        {false && paymentMethod === 'apm' && (
          <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed font-semibold">
            APM 订阅激活传 ONE_TOUCH，并默认 targetOrg: KAKAOPAY。<br />
            当前演示已固定使用 KR / KRW。<br />
            切换 APM 后币种会同步为 KRW；后续扣款 1000，优惠期 100，试用激活 0。<br />
            API 模式与前置组件模式都会按 KAKAOPAY 组装参数。
          </div>
        )}
        {false && paymentMethod === 'apm' && (
          <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed font-semibold">
            • APM 指定方式时传 ONE_TOUCH<br />
            • country 字段必传（如 KR、MY...）<br />
            • 不支持前置组件集成方式
          </div>
        )}
      </section>

      {/* 重置按钮 */}
      <div className="pt-5 border-t border-slate-100 mt-auto">
        <button onClick={reset}
          className="w-full h-9 text-slate-500 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          ↺ 重置所有步骤
        </button>
      </div>
    </div>
  );
};

// ── 标准收单配置面板 ────────────────────────────────────────────────────────
const StandardSidebar: React.FC = () => {
  const { 
    integrationMode, setIntegrationMode,
    cashierMode, setCashierMode,
    paymentMethod, setPaymentMethod,
    resetFlow
  } = useProduct();

  const isFullCashier = integrationMode === 'cashier' && cashierMode === 'ALL';

  const integrationOptions: Option[] = (Object.keys(PAYMENT_INTEGRATION_CONFIG) as PaymentIntegrationMode[]).map(key => {
    const isCashier = key === 'cashier';
    const isActive = integrationMode === key;
    
    return {
      id: key,
      label: PAYMENT_INTEGRATION_CONFIG[key].label,
      desc: PAYMENT_INTEGRATION_CONFIG[key].desc,
      // 仅在收银台模式且激活时显示子切换器
      additionalInfo: isCashier && isActive ? (
        <div className="flex bg-white/50 p-0.5 rounded-lg border border-indigo-200/50 items-center overflow-hidden">
          {(['ALL', 'SPECIFIC'] as const).map((m) => {
            const isSel = cashierMode === m;
            return (
              <button
                key={m}
                onClick={() => setCashierMode(m)}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold transition-all rounded-[6px]",
                  isSel ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {m === 'ALL' ? '全量收银台' : '指定支付方式'}
              </button>
            );
          })}
        </div>
      ) : undefined
    };
  });

  const methodOptions: Option[] = (Object.keys(PAYMENT_METHOD_CONFIG) as PaymentMethod[]).map(key => ({
    id: key, 
    label: PAYMENT_METHOD_CONFIG[key].label 
  }));

  return (
    <div className="space-y-7">
      {/* 集成方式 */}
      <section className="space-y-2">
        <SectionTitle>集成方式</SectionTitle>
        <SettingSelector 
          options={integrationOptions} 
          value={integrationMode} 
          onChange={(id) => setIntegrationMode(id as PaymentIntegrationMode)} 
          type="card"
        />
      </section>

      {/* 支付方式 */}
      <section className="hidden">
        <div className="flex justify-between items-center mb-2">
          <SectionTitle className="mb-0">支付方式</SectionTitle>
          {isFullCashier && (
            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 animate-pulse">
              MANAGED BY PAYERMAX
            </span>
          )}
        </div>
        
        <div className={cn(isFullCashier ? "pointer-events-none" : "")}>
          <SettingSelector 
            options={methodOptions} 
            value={paymentMethod} 
            onChange={(id) => setPaymentMethod(id as PaymentMethod)} 
            type="radio"
            name="stdPaymentMethod"
          />
        </div>
        
        {isFullCashier && (
          <p className="mt-3 text-[10px] text-slate-400 font-medium italic leading-relaxed">
            • 全量收银台模式下，无需指定方式<br/>
            • 终端用户可在 PayerMax 页面自主选择
          </p>
        )}
      </section>

      <div className="pt-5 border-t border-slate-100">
        <button
          onClick={() => resetFlow()}
          className="w-full h-9 text-slate-500 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          重置所有步骤
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-lg">💡</div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          切换不同的集成模式，<br/>右侧代码报文将同步更新。
        </p>
      </div>
    </div>
  );
};

// ── 链接支付配置面板 ──────────────────────────────────────────────────────────
const LinkSidebar: React.FC = () => {
  const { linkMode, setLinkMode, resetFlow } = useProduct();

  const options: Option[] = (['api', 'dashboard'] as LinkMode[]).map(key => ({
    id: key,
    label: LINK_MODE_CONFIG[key].label,
    desc: LINK_MODE_CONFIG[key].desc
  }));

  return (
    <div className="space-y-7">
      <section className="space-y-2">
        <SectionTitle>支付配置</SectionTitle>
        <SettingSelector 
          options={options} 
          value={linkMode} 
          onChange={(id) => setLinkMode(id as LinkMode)} 
          type="card"
        />
      </section>

      <div className="pt-5 border-t border-slate-100">
        <button
          onClick={() => resetFlow()}
          className="w-full h-9 text-slate-500 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          重置所有步骤
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-lg">🔗</div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          链接支付支持多种分发场景，<br/>无论是后台手动还是 API 自动。
        </p>
      </div>
    </div>
  );
};

const DefaultSidebar: React.FC = () => (
  <div className="space-y-6 text-slate-400 text-sm text-center pt-10">
    <p>请从顶部选择业务模式</p>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] mb-2", className)}>
    {children}
  </div>
);
