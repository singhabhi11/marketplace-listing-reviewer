import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { DiffViewer } from '../components/DiffViewer';
import { Modal } from '../components/Modal';

describe('Frontend Core UI Components', () => {
  it('renders Critical and High severity badges correctly', () => {
    const { rerender } = render(<SeverityBadge severity="Critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();

    rerender(<SeverityBadge severity="High" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders Approved and Changes Suggested status badges', () => {
    const { rerender } = render(<StatusBadge status="Approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(<StatusBadge status="Changes Suggested" />);
    expect(screen.getByText('Changes Suggested')).toBeInTheDocument();
  });

  it('renders DiffViewer with original and suggested revision values', () => {
    render(
      <DiffViewer
        fieldName="title"
        originalValue="REPLICA WATCH 100% CURE"
        revisedValue="Curated Mechanical Timepiece"
      />
    );

    expect(screen.getByText('Field: title')).toBeInTheDocument();
    expect(screen.getByText('REPLICA WATCH 100% CURE')).toBeInTheDocument();
    expect(screen.getByText('Curated Mechanical Timepiece')).toBeInTheDocument();
  });

  it('renders Modal when isOpen is true and hides when false', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Approval Modal">
        <p>Modal content text</p>
      </Modal>
    );

    expect(screen.getByText('Test Approval Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content text')).toBeInTheDocument();

    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Test Approval Modal">
        <p>Modal content text</p>
      </Modal>
    );

    expect(screen.queryByText('Test Approval Modal')).not.toBeInTheDocument();
  });
});
