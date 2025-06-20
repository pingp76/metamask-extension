import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../../../components/component-library';

// TODO: Replace with actual icons from the component library if available
const MagicWandIcon = () => <span>✨</span>;
const LoadingIcon = () => <span>🔄</span>;

export const AnalysisButton = ({ onClick, isLoading }) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      startIcon={isLoading ? <LoadingIcon /> : <MagicWandIcon />}
    >
      {isLoading ? '正在分析...' : 'AI 分析交易'}
    </Button>
  );
};

AnalysisButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};