import React from 'react';
import { useProduct, MODES_DESC } from '@/contexts/ProductContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { DynamicStepper } from '@/components/shared/DynamicStepper';
import { MacCodeSnippet, type CodeSection } from '@/components/shared/MacCodeSnippet';
import { PhoneSimulator } from '@/components/shared/PhoneSimulator';
import { StepRouter as SubscriptionStepRouter } from '@/components/features/subscription/StepRouter';
import { StandardStepRouter } from '@/components/features/standard/StepRouter';
import { LinkStepRouter } from '@/components/features/link/StepRouter';
import { calculateActivationAmount, normalizeApmSubscriptionParams, normalizeFullCashierSubscriptionParams } from '@/types/subscription';
import { getErrorMessage, showUiWarning } from '@/lib/uiFeedback';
import { ArrowRight, CheckCircle2, ClipboardList, Link2, QrCode, Send, SearchCheck } from 'lucide-react';

const SHOW_CODE_EXECUTE_BUTTONS = false;

export const Playzone: React.FC = () => {
  const { productMode } = useProduct();
  const isSubscription = productMode === 'SUBSCRIPTION';

  return isSubscription ? <SubscriptionPlayzone /> : <DefaultPlayzone />;
};

// ─── 订阅代扣沙盘 ─────────────────────────────────────────────────────────────
const SubscriptionPlayzone: React.FC = () => {
  const { productMode } = useProduct();
  const {
    steps, currentStepIndex, currentStep, isFinalStep,
    triggerFlash, goNextWithApi, goPrev,
    stepApiExchanges,
    activationRedirectUrl, componentPaymentToken, mandateTokenId, mandateBindOrderNo,
    subMode, integrationMode, paymentMethod, subscriptionType, formParams, subscriptionUserId,
  } = useSubscription();

  const stepperSteps = steps.map(s => ({ id: s.id, label: s.title }));
  const currentHint = steps[currentStepIndex]?.hint ?? '';
  const currentExchange = currentStep?.id ? stepApiExchanges[currentStep.id] : undefined;
  const payermaxDisplayParams = subMode === 'payermax'
    ? (paymentMethod === 'apm' ? normalizeApmSubscriptionParams(formParams) : normalizeFullCashierSubscriptionParams(formParams))
    : formParams;
  const payermaxDisplayCountry = subMode === 'payermax'
    ? 'KR'
    : (paymentMethod === 'apm' ? 'KR' : 'ID');
  const frontendParamSections: CodeSection[] | undefined = !currentExchange && currentStepIndex === 0
    ? [{
        title: 'Frontend Parameters',
        endpoint: { method: 'POST', url: subMode === 'payermax' ? '/api/subscriptionCreate' : '/api/orderAndPay' },
        requestBody: JSON.stringify({
          note: '前端第一步收集用户选择的业务参数，用于后续请求PayerMax接口',
          product: 'SUBSCRIPTION',
          subMode,
          integrationMode,
          paymentMethod: paymentMethod || 'ALL_CASHIER',
          userId: subscriptionUserId,
          subscriptionType,
          formParams: {
            currency: payermaxDisplayParams.currency,
            country: payermaxDisplayCountry,
            amount: payermaxDisplayParams.amount,
            activationAmount: subMode === 'payermax'
              ? calculateActivationAmount(subscriptionType, payermaxDisplayParams)
              : undefined,
            totalPeriods: payermaxDisplayParams.totalPeriods,
            periodUnit: payermaxDisplayParams.periodUnit,
            periodCount: payermaxDisplayParams.periodCount,
            trialDays: payermaxDisplayParams.trialDays,
            trialAmount: payermaxDisplayParams.trialAmount,
            trialPeriodCount: payermaxDisplayParams.trialPeriodCount,
            trialPeriodAmount: payermaxDisplayParams.trialPeriodAmount,
          },
          nextPayerMaxAction: subMode === 'payermax'
            ? '创建 PayerMax 管理订阅计划 subscriptionCreate'
            : '首次绑定支付方式 orderAndPay，获取 paymentTokenID 供后续扣款',
        }, null, 2),
      }]
    : undefined;
  const handleSubscriptionExecute = async () => {
    if (integrationMode === 'component') {
      if ((currentStep.id === 'pm-2' || currentStep.id === 'pm-component' || currentStep.id === 'm-order' || currentStep.id === 'np-order') && !componentPaymentToken) {
        showUiWarning('请先在右侧仿真手机内完成前置组件授权，获取 paymentToken 后再执行请求。');
        return;
      }
      if ((currentStep.id === 'm-component' || currentStep.id === 'np-component') && !componentPaymentToken) {
        showUiWarning('请先在右侧仿真手机内选择支付方式并获取 paymentToken。paymentToken 只能由组件授权后返回。');
        return;
      }
    }

    if ((currentStep.id === 'm-bound' || currentStep.id === 'np-bound') && !mandateBindOrderNo) {
      showUiWarning('请先完成首次绑定下单，拿到真实订单号后再查询绑定结果。');
      return;
    }

    if ((currentStep.id === 'm-deduct' || currentStep.id === 'np-deduct') && !mandateTokenId) {
      showUiWarning('请先完成首次绑定并通过 orderQuery 获取 paymentTokenID，再发起后续扣款。');
      return;
    }

    try {
      await goNextWithApi();
    } catch (error) {
      showUiWarning(getErrorMessage(error));
    }
  };

  return (
    <main className="flex-1 h-full overflow-hidden bg-slate-50 relative z-10 flex flex-col">
      <div className="bg-white border-b border-slate-200/70 px-10 pt-4 pb-5 shrink-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Operation Pipeline</h3>
            <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded-md border border-indigo-100">
              {MODES_DESC[productMode]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                上一步
              </button>
            )}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Step {currentStepIndex + 1} / {steps.length}
            </span>
          </div>
        </div>
        <DynamicStepper steps={stepperSteps} currentStepId={currentStep?.id ?? ''} />
        {currentHint && (
          <p className="text-[11px] text-slate-400 font-semibold mt-3 flex items-center gap-1.5">
            <span>💡</span>{currentHint}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full pb-20 pl-8">
          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-7 flex flex-col space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 border-l-2 border-indigo-500 py-0.5">API Specification (Dev View)</h3>
              <div className="min-h-[560px]">
                <MacCodeSnippet
                  className="h-full"
                  endpoint={currentExchange?.endpoint}
                  requestBody={currentExchange?.requestBody}
                  responseBody={currentExchange?.responseBody}
                  sections={currentExchange?.sections || frontendParamSections}
                  filename={`${currentStep?.id ?? 'step'}.json`}
                  flashTrigger={triggerFlash}
                  onExecute={SHOW_CODE_EXECUTE_BUTTONS ? () => { void handleSubscriptionExecute(); } : undefined}
                  isExecuteDisabled={isFinalStep}
                />
              </div>
            </div>
            <div className="col-span-5 flex flex-col space-y-2 items-center">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 w-full border-l-2 border-blue-500 py-0.5">Interactive Demo (User View)</h3>
              <PhoneSimulator theme="light" contentScroll={!(currentStep?.id === 'pm-activate' && activationRedirectUrl)}>
                <SubscriptionStepRouter />
              </PhoneSimulator>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const DashboardPayLinkGuide: React.FC = () => {
  const guideSteps = [
    {
      key: 'A',
      title: '创建链接',
      desc: '登录 PayerMax 商户平台（MMC），进入收单产品 → 链接支付 → 创建链接。',
      icon: Link2,
    },
    {
      key: 'B',
      title: '录入订单信息',
      desc: '填写商品名称、订单金额、收单国家、有效期等一次性支付链接参数。',
      icon: ClipboardList,
    },
    {
      key: 'C',
      title: '生成链接 / 二维码',
      desc: 'MMC 自动生成支付链接与二维码，商户可复制链接或下载二维码。',
      icon: QrCode,
    },
    {
      key: 'D',
      title: '发送至用户完成支付',
      desc: '用户打开链接或扫码完成支付，支付后可通过 MMC 或 API 查询结果。',
      icon: Send,
    },
  ];

  return (
    <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative z-10">
      <div className="bg-white border-b border-slate-200/70 px-10 pt-5 pb-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Operation Pipeline</h3>
          <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded-md border border-indigo-100">
            链接支付
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-md border border-slate-200">
            MMC 创建
          </span>
        </div>
      </div>

      <div className="px-10 py-10">
        <section className="max-w-6xl mx-auto overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)]">
          <div className="grid grid-cols-12">
            <div className="col-span-12 xl:col-span-4 bg-slate-950 text-white p-8 flex flex-col justify-between min-h-[460px]">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-950/30 mb-6">
                  <Link2 className="h-6 w-6" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-indigo-200 font-black mb-3">Pay by Link</p>
                <h1 className="text-3xl font-black tracking-tight leading-tight mb-4">
                  商户后台创建一次性支付链接
                </h1>
                <p className="text-sm leading-7 text-slate-300">
                  PayerMax 允许商户登录商户平台（MMC）创建一次性支付链接并生成二维码，适合人工录单、客服收款、线下分发等场景。
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-black mb-2">MMC Path</p>
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  <span>收单产品</span>
                  <ArrowRight className="h-4 w-4 text-indigo-300" />
                  <span>链接支付</span>
                  <ArrowRight className="h-4 w-4 text-indigo-300" />
                  <span>创建链接</span>
                </div>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-8 p-8">
              <div className="flex items-start justify-between gap-6 mb-7">
                <div>
                  <h2 className="text-xl font-black text-slate-900">四步完成后台创建</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    该模式不需要调用创建接口，也不需要仿真手机演示；商户按 MMC 页面指引录入信息即可。
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-4 py-2 text-xs font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  无需开发创建接口
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guideSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-[11px] font-black text-white">
                              {step.key}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Step {index + 1}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 mb-2">{step.title}</h3>
                          <p className="text-sm leading-6 text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-sm">
                  <SearchCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-1">支付结果查询</h3>
                  <p className="text-sm leading-6 text-slate-600">
                    用户支付完成后，商户可登录 MMC 查看结果，也可以使用 API 主动查询订单状态；展示给用户前应以查询或回调结果为准。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

// ─── 标准收单沙盘 ─────────────────────────────────────────────────────────────
const DefaultPlayzone: React.FC = () => {
  const {
    productMode, integrationMode, cashierMode, paymentMethod, cashierPaymentMethod,
    steps, currentStep, toNextStep, goPrev, triggerFlash, stepApiExchanges,
    amount, currency, country, userId, linkMode, paymentToken, submitComponentOrder,
  } = useProduct();

  if (productMode === 'PAYMENT_LINK' && linkMode === 'dashboard') {
    return <DashboardPayLinkGuide />;
  }

  const isFinalStep = currentStep === steps[steps.length - 1]?.id;
  const stepIndex = steps.findIndex(s => s.id === currentStep);
  const currentExchange = stepApiExchanges[currentStep]
    || (productMode === 'PAYMENT_LINK' && currentStep === 'l2' ? stepApiExchanges.l1 : undefined);
  const frontendParamSections: CodeSection[] | undefined = !currentExchange && currentStep === steps[0]?.id
    ? [{
        title: 'Frontend Parameters',
        endpoint: {
          method: 'POST',
          url: productMode === 'PAYMENT_LINK' ? '/api/createPaybylink' : '/api/orderAndPay',
        },
        requestBody: JSON.stringify(productMode === 'PAYMENT_LINK'
          ? {
              note: '前端第一步收集支付链接商品参数，用户或许创建链接使用',
              product: 'PAYMENT_LINK',
              linkMode,
              goodsName: 'PayerMax Smart Watch Pro',
              linkType: 'ONETIME',
              country: 'ID',
              currency: 'IDR',
              totalAmount: '40000',
              expiresTime: '86400',
              userId,
              nextPayerMaxAction: 'createPaybylink 返回 linkUrl 与 qrCodeUrl',
            }
          : {
              note: '前端第一步收集商品、用户和支付选择，用于后续请求PayerMax接口',
              product: 'STANDARD',
              integrationMode,
              cashierMode,
              paymentMethod: integrationMode === 'cashier' && cashierMode === 'ALL'
                ? 'ALL_CASHIER'
                : (cashierPaymentMethod || paymentMethod),
              amount,
              currency,
              country,
              userId,
              subject: 'diamond 700',
              nextPayerMaxAction: integrationMode === 'component'
                ? 'applySession 获取 sessionKey，或 orderAndPay 下单'
                : 'orderAndPay 创建支付订单',
            }, null, 2),
      }]
    : undefined;
  const shouldDisableExecute = isFinalStep;
  const handleDefaultExecute = async () => {
    if (productMode === 'STANDARD') {
      const isSelfHostedFirstStep = currentStep === 's1'
        && (integrationMode === 'api' || (integrationMode === 'cashier' && cashierMode === 'SPECIFIC'));
      if (isSelfHostedFirstStep) {
        showUiWarning('请先在右侧仿真手机点击 Buy Now，并在自建收银台内选择支付方式。');
        return;
      }

      if (integrationMode === 'component' && currentStep === 's2' && !paymentToken) {
        showUiWarning('请先在右侧仿真手机内选择支付方式并完成组件授权，获取 paymentToken 后再执行下一步。');
        return;
      }

      if (integrationMode === 'component' && currentStep === 's3') {
        if (!paymentToken) {
          showUiWarning('请先回到右侧仿真手机自建收银台获取 paymentToken，再执行 orderAndPay。');
          return;
        }
        await submitComponentOrder('s3');
        return;
      }
    }

    if (productMode === 'PAYMENT_LINK' && currentStep === 'l2') {
      showUiWarning('请确认用户已在右侧仿真手机打开链接并完成支付后，再查询链接状态。');
    }

    await toNextStep();
  };

  return (
    <main className="flex-1 h-full overflow-hidden bg-slate-50 relative z-10 flex flex-col">
      <div className="bg-white border-b border-slate-200/70 px-10 pt-4 pb-5 shrink-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Operation Pipeline</h3>
            <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded-md border border-indigo-100">
              {MODES_DESC[productMode]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                上一步
              </button>
            )}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Step {stepIndex + 1} / {steps.length}
            </span>
          </div>
        </div>
        <DynamicStepper steps={steps} currentStepId={currentStep} />
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full pb-20 pl-8">
          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-7 flex flex-col space-y-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 border-l-2 border-indigo-500 py-0.5">API Specification (Dev View)</h3>
              <div className="min-h-[560px]">
                <MacCodeSnippet
                  className="h-full"
                  endpoint={currentExchange?.endpoint}
                  requestBody={currentExchange?.requestBody}
                  responseBody={currentExchange?.responseBody}
                  sections={currentExchange?.sections || frontendParamSections}
                  filename={`system_${currentStep}.json`}
                  flashTrigger={triggerFlash}
                  onExecute={SHOW_CODE_EXECUTE_BUTTONS ? () => { void handleDefaultExecute(); } : undefined}
                  isExecuteDisabled={shouldDisableExecute}
                />
              </div>
            </div>
            <div className="col-span-5 flex flex-col space-y-2 items-center">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 w-full border-l-2 border-blue-500 py-0.5">Interactive Demo (User View)</h3>
              <PhoneSimulator theme="light">
                {productMode === 'PAYMENT_LINK' ? <LinkStepRouter /> : <StandardStepRouter />}
              </PhoneSimulator>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
