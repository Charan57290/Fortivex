import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ClassificationBadge, SentimentBadge, StatusBadge } from '../src/components/ui/Badges';

describe('UI Badge Components', () => {
  it('renders lead classification, sentiment, and status badges', () => {
    render(
      <div>
        <ClassificationBadge value="HOT" />
        <SentimentBadge value="POSITIVE" />
        <StatusBadge value="PRODUCT_DEMO" />
      </div>
    );

    expect(screen.getByText('HOT')).toBeInTheDocument();
    expect(screen.getByText('POSITIVE')).toBeInTheDocument();
    expect(screen.getByText('PRODUCT DEMO')).toBeInTheDocument();
  });
});
