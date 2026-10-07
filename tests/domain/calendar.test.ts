import { describe, expect, it } from 'vitest';
import { isDateOnly, isTimezone, resolveSchoolDay, schoolToday } from '../../src/domain/calendar';
import { attendanceTotals } from '../../src/domain/attendance';
describe('school calendar', () => {
  it('rejects normalized dates and supports leap dates', () => { expect(isDateOnly('2026-02-31')).toBe(false); expect(isDateOnly('2024-02-29')).toBe(true); expect(isDateOnly('2026-02-29')).toBe(false); expect(isDateOnly('26-01-01')).toBe(false); expect(isDateOnly('0000-01-01')).toBe(false); });
  it('resolves midnight in two school timezones independently of host timezone', () => {
    expect(schoolToday('Asia/Kuala_Lumpur', () => new Date('2026-10-06T15:59:59Z'))).toBe('2026-10-06');
    expect(schoolToday('Asia/Kuala_Lumpur', () => new Date('2026-10-06T16:00:00Z'))).toBe('2026-10-07');
    expect(schoolToday('America/New_York', () => new Date('2026-10-07T03:59:59Z'))).toBe('2026-10-06');
    expect(schoolToday('America/New_York', () => new Date('2026-10-07T04:00:00Z'))).toBe('2026-10-07');
    expect(isTimezone('School/Unknown')).toBe(false); expect(isTimezone('+03:00')).toBe(false);
  });
  it('overrides weekdays and limits days to academic year', () => {
    const calendar = { startsOn: '2026-01-01', endsOnExclusive: '2027-01-01', weekdays: [1,2,3,4,5], overrides: [{ date: '2026-10-06', isSchoolDay: false, reason: 'Libur' }, { date: '2026-10-10', isSchoolDay: true, reason: 'Tambahan' }] };
    expect(resolveSchoolDay('2026-10-06', calendar)).toEqual({ inYear: true, isSchoolDay: false, reason: 'Libur' });
    expect(resolveSchoolDay('2026-10-10', calendar).isSchoolDay).toBe(true);
    expect(resolveSchoolDay('2027-01-01', calendar).inYear).toBe(false);
    expect(attendanceTotals([{status:'H'},{status:'A'},{status:'H'}])).toEqual({H:2,S:0,I:0,A:1});
  });
});
