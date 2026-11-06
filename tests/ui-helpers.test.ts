import { describe, it, expect } from 'vitest';
import { filterRecords, sortRecords, SortField, SortDirection } from '../src/lib/filter-utils';
import { RecordItem } from '../src/lib/types';

describe('filterRecords', () => {
  const records: RecordItem[] = [
    {
      id: '1',
      name: 'Alice Young',
      email: 'alice@a.com',
      role: 'Dev',
      status: 'Active',
      notes: 'Frontend specialist',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Bob Dylan',
      email: 'bob@b.com',
      role: 'Music Lead',
      status: 'Inactive',
      notes: 'On sabbatical',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
    {
      id: '3',
      name: 'Charlie Brown',
      email: 'charlie@c.com',
      role: 'Product Manager',
      status: 'Pending',
      notes: 'Awaiting onboarding',
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    },
  ];

  it('filters records by search query case-insensitively across name', () => {
    const result = filterRecords(records, 'alice', 'All');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice Young');
  });

  it('filters records by search query across email', () => {
    const result = filterRecords(records, 'bob@b.com', 'All');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Bob Dylan');
  });

  it('filters records by search query across role', () => {
    const result = filterRecords(records, 'product', 'All');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Charlie Brown');
  });

  it('filters records by search query across notes', () => {
    const result = filterRecords(records, 'sabbatical', 'All');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Bob Dylan');
  });

  it('filters records by status tag', () => {
    const result = filterRecords(records, '', 'Inactive');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Bob Dylan');
  });

  it('returns all records when query is empty and status is All', () => {
    const result = filterRecords(records, '', 'All');
    expect(result.length).toBe(3);
  });

  it('combines search query and status filter correctly', () => {
    const result = filterRecords(records, 'young', 'Active');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice Young');

    const noMatch = filterRecords(records, 'young', 'Inactive');
    expect(noMatch.length).toBe(0);
  });

  it('handles whitespace-only queries by ignoring them', () => {
    const result = filterRecords(records, '   ', 'All');
    expect(result.length).toBe(3);
  });
});

describe('sortRecords', () => {
  const records: RecordItem[] = [
    {
      id: '1',
      name: 'Charlie',
      email: 'charlie@c.com',
      role: 'Manager',
      status: 'Pending',
      notes: '',
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Alice',
      email: 'alice@a.com',
      role: 'Engineer',
      status: 'Active',
      notes: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    },
    {
      id: '3',
      name: 'bob',
      email: 'bob@b.com',
      role: 'Designer',
      status: 'Inactive',
      notes: '',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ];

  it('sorts records ascending by name case-insensitively', () => {
    const sorted = sortRecords(records, 'name', 'asc');
    expect(sorted.map(r => r.name)).toEqual(['Alice', 'bob', 'Charlie']);
  });

  it('sorts records descending by name case-insensitively', () => {
    const sorted = sortRecords(records, 'name', 'desc');
    expect(sorted.map(r => r.name)).toEqual(['Charlie', 'bob', 'Alice']);
  });

  it('sorts records ascending by createdAt date', () => {
    const sorted = sortRecords(records, 'createdAt', 'asc');
    expect(sorted.map(r => r.id)).toEqual(['1', '3', '2'].reverse()); // '1' is 2026-01-03, '2' is 01, '3' is 02 -> asc: 2, 3, 1
    expect(sorted.map(r => r.name)).toEqual(['Alice', 'bob', 'Charlie']);
  });

  it('sorts records descending by createdAt date', () => {
    const sorted = sortRecords(records, 'createdAt', 'desc');
    expect(sorted.map(r => r.name)).toEqual(['Charlie', 'bob', 'Alice']);
  });

  it('does not mutate the original array', () => {
    const copy = [...records];
    sortRecords(records, 'name', 'asc');
    expect(records).toEqual(copy);
  });
});
