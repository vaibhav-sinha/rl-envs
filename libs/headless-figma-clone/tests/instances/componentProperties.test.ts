import { describe, expect, it } from 'vitest';
import {
  componentPropertyLabel,
  mergeComponentPropertyValues,
  resolveCanonicalPropertyKey,
} from '../../src/instances/componentProperties.js';

describe('componentProperties', () => {
  it('componentPropertyLabel strips suffix after #', () => {
    expect(componentPropertyLabel('Text#2613:0')).toBe('Text');
    expect(componentPropertyLabel('State')).toBe('State');
  });

  it('resolveCanonicalPropertyKey maps short label to suffixed key', () => {
    const current = {
      'Text#2613:0': { type: 'TEXT' as const, value: 'Resend code in 1:00' },
      State: { type: 'VARIANT' as const, value: 'Default' },
    };
    expect(resolveCanonicalPropertyKey(current, 'Text')).toBe('Text#2613:0');
    expect(resolveCanonicalPropertyKey(current, 'Text#2613:0')).toBe('Text#2613:0');
  });

  it('resolveCanonicalPropertyKey uses definition keys when instance props are empty', () => {
    expect(resolveCanonicalPropertyKey(undefined, 'Text', ['Text#1:0'])).toBe('Text#1:0');
  });

  it('mergeComponentPropertyValues updates canonical key not duplicate short key', () => {
    const current = {
      'Text#2613:0': { type: 'TEXT' as const, value: 'Resend code in 1:00' },
    };
    const next = mergeComponentPropertyValues(
      current,
      { Text: 'You have reached your max attempts.' },
      ['Text#2613:0']
    );
    expect(next['Text#2613:0']?.value).toBe('You have reached your max attempts.');
    expect(next.Text).toBeUndefined();
  });
});
