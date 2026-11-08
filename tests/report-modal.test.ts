import { describe, it, expect } from 'vitest';
import {
  ReportModal,
  REPORT_MODAL_TITLE,
  REPORT_PRINT_CONTAINER_ID,
} from '@/components/ReportModal';

describe('ReportModal Component Contract & SSR Safety', () => {
  it('exports ReportModal as a valid React component function', () => {
    expect(typeof ReportModal).toBe('function');
  });

  it('exports official Thai report title constant', () => {
    expect(REPORT_MODAL_TITLE).toBe('รายงานสรุปสถานะครุภัณฑ์');
  });

  it('exports a stable print container ID', () => {
    expect(REPORT_PRINT_CONTAINER_ID).toBe('printable-report');
  });

  it('can be imported safely in a Node/SSR environment without throwing', async () => {
    const mod = await import('@/components/ReportModal');
    expect(mod.ReportModal).toBeDefined();
    expect(mod.REPORT_MODAL_TITLE).toBeDefined();
    expect(mod.REPORT_PRINT_CONTAINER_ID).toBeDefined();
  });
});
