import { ReactNodeLike } from 'prop-types';
import React, { ReactNode, useCallback, useState } from 'react';

import { Page } from '../../../components/multichain/pages/page';
import { GasFeeContextProvider } from '../../../contexts/gasFee';
import { TransactionModalContextProvider } from '../../../contexts/transaction-modal';
import AdvancedGasFeePopover from '../components/advanced-gas-fee-popover';
import { BlockaidLoadingIndicator } from '../components/confirm/blockaid-loading-indicator';
import { ConfirmAlerts } from '../components/confirm/confirm-alerts';
import { Footer } from '../components/confirm/footer';
import { Header } from '../components/confirm/header';
import { Info } from '../components/confirm/info';
import { LedgerInfo } from '../components/confirm/ledger-info';
import { SmartTransactionsBannerAlert } from '../components/smart-transactions-banner-alert';
import { PluggableSection } from '../components/confirm/pluggable-section';
import ScrollToBottom from '../components/confirm/scroll-to-bottom';
import { Title } from '../components/confirm/title';
import EditGasFeePopover from '../components/edit-gas-fee-popover';
import { ConfirmContextProvider, useConfirmContext } from '../context/confirm';
import { ConfirmNav } from '../components/confirm/nav/nav';
import { GasFeeTokenToast } from '../components/confirm/info/shared/gas-fee-token-toast/gas-fee-token-toast';
import { Splash } from '../components/confirm/splash';

// --- LLM Analysis Imports ---
import { LlmTransactionAnalysisService } from '../../../../shared/lib/llm-analysis-service';
import { formatTransactionForLLM } from '../utils/llm-analytics.util';
import { AnalysisButton } from '../components/llm-transaction-analysis/AnalysisButton';
import { AnalysisResult } from '../components/llm-transaction-analysis/AnalysisResult';
// --- End LLM Analysis Imports ---

// Define a type for the analysis result state
type AnalysisData = {
  analysis: string;
  riskLevel: 'low' | 'medium' | 'high';
};

type ApiError = {
  error: string;
  details?: string;
};

// --- End LLM Analysis Types ---

const EIP1559TransactionGasModal = () => {
  return (
    <>
      <EditGasFeePopover />
      <AdvancedGasFeePopover />
    </>
  );
};

const GasFeeContextProviderWrapper: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const { currentConfirmation } = useConfirmContext();
  return (
    <GasFeeContextProvider transaction={currentConfirmation}>
      {children as NonNullable<ReactNodeLike>}
    </GasFeeContextProvider>
  );
};

const LlmAnalysisSection = () => {
  const { currentConfirmation } = useConfirmContext();
  const [analysisState, setAnalysisState] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const handleAnalyzeClick = useCallback(async () => {
    setAnalysisState('loading');
    setAnalysisData(null);

    const service = new LlmTransactionAnalysisService();
    // The 'currentConfirmation' can be one of many types. We check for txParams
    // to ensure we're dealing with a transaction-like confirmation.
    if (!('txParams' in currentConfirmation)) {
      setAnalysisState('error');
      setAnalysisData({
        analysis: 'This type of confirmation cannot be analyzed.',
        riskLevel: 'high',
      });
      return;
    }
    const formattedData = formatTransactionForLLM(currentConfirmation);

    if (!formattedData) {
      setAnalysisState('error');
      setAnalysisData({
        analysis: 'Could not format transaction data for analysis.',
        riskLevel: 'high',
      });
      return;
    }

    const result: AnalysisData | ApiError = await service.analyzeTransaction(
      formattedData,
    );

    if ('error' in result) {
      setAnalysisState('error');
      setAnalysisData({ analysis: result.error, riskLevel: 'high' });
    } else {
      setAnalysisState('done');
      setAnalysisData(result);
    }
  }, [currentConfirmation]);

  return (
    <div style={{ padding: '0 16px' }}>
      <AnalysisButton
        onClick={handleAnalyzeClick}
        isLoading={analysisState === 'loading'}
      />
      {analysisData && (
        <AnalysisResult
          analysis={analysisData.analysis}
          riskLevel={analysisData.riskLevel}
        />
      )}
    </div>
  );
};

const Confirm = () => (
  <ConfirmContextProvider>
    <TransactionModalContextProvider>
      {/* This context should be removed once we implement the new edit gas fees popovers */}
      <GasFeeContextProviderWrapper>
        <EIP1559TransactionGasModal />
        <ConfirmAlerts>
          <Page className="confirm_wrapper">
            <ConfirmNav />
            <Header />
            <SmartTransactionsBannerAlert marginType="noTop" />
            <ScrollToBottom>
              <BlockaidLoadingIndicator />
              <LedgerInfo />
              <Title />
              <Info />
              <PluggableSection />
              <LlmAnalysisSection />
            </ScrollToBottom>
            <GasFeeTokenToast />
            <Footer />
            <Splash />
          </Page>
        </ConfirmAlerts>
      </GasFeeContextProviderWrapper>
    </TransactionModalContextProvider>
  </ConfirmContextProvider>
);

export default Confirm;
