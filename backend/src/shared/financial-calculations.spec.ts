import {
  calculateInvestment,
  calculateCurrentValue,
  calculateLivePnL,
  calculateReturnPct,
  calculateRealizedPnL,
  calculateRealizedReturnPct,
  calculatePotentialProfit,
  calculateMissedProfit,
  formatDecimal,
} from './financial-calculations';

describe('Financial Calculations Engine Audit Suite', () => {
  // TEST 1
  // Buy = 100, CMP = 100.30, Qty = 10
  // Expected: P&L = +3.00, Return = +0.30%
  test('TEST 1: Buy = 100, CMP = 100.30, Qty = 10 (BUY)', () => {
    const buyPrice = 100;
    const cmp = 100.30;
    const qty = 10;
    const pnl = calculateLivePnL(buyPrice, cmp, qty, 'BUY');
    const ret = calculateReturnPct(buyPrice, cmp, 'BUY');
    
    expect(pnl).toBeCloseTo(3.00, 2);
    expect(ret).toBeCloseTo(0.30, 2);
    expect(formatDecimal(pnl)).toBe('3.00');
    expect(formatDecimal(ret)).toBe('0.30');
  });

  // TEST 2
  // Buy = 100, CMP = 99.70, Qty = 10
  // Expected: P&L = -3.00, Return = -0.30%
  test('TEST 2: Buy = 100, CMP = 99.70, Qty = 10 (BUY)', () => {
    const buyPrice = 100;
    const cmp = 99.70;
    const qty = 10;
    const pnl = calculateLivePnL(buyPrice, cmp, qty, 'BUY');
    const ret = calculateReturnPct(buyPrice, cmp, 'BUY');
    
    expect(pnl).toBeCloseTo(-3.00, 2);
    expect(ret).toBeCloseTo(-0.30, 2);
    expect(formatDecimal(pnl)).toBe('-3.00');
    expect(formatDecimal(ret)).toBe('-0.30');
  });

  // TEST 3
  // Buy = 2000, Exit = 2100, Qty = 5
  // Expected: P&L = +500, Return = +5%
  test('TEST 3: Buy = 2000, Exit = 2100, Qty = 5 (BUY)', () => {
    const buyPrice = 2000;
    const exitPrice = 2100;
    const qty = 5;
    const pnl = calculateRealizedPnL(buyPrice, exitPrice, qty, 'BUY');
    const ret = calculateRealizedReturnPct(buyPrice, exitPrice, 'BUY');
    
    expect(pnl).toBeCloseTo(500, 2);
    expect(ret).toBeCloseTo(5, 2);
    expect(formatDecimal(pnl)).toBe('500.00');
    expect(formatDecimal(ret)).toBe('5.00');
  });

  // TEST 4
  // Buy = 2000, Exit = 1900, Qty = 5
  // Expected: P&L = -500, Return = -5%
  test('TEST 4: Buy = 2000, Exit = 1900, Qty = 5 (BUY)', () => {
    const buyPrice = 2000;
    const exitPrice = 1900;
    const qty = 5;
    const pnl = calculateRealizedPnL(buyPrice, exitPrice, qty, 'BUY');
    const ret = calculateRealizedReturnPct(buyPrice, exitPrice, 'BUY');
    
    expect(pnl).toBeCloseTo(-500, 2);
    expect(ret).toBeCloseTo(-5, 2);
    expect(formatDecimal(pnl)).toBe('-500.00');
    expect(formatDecimal(ret)).toBe('-5.00');
  });

  // TEST 5
  // Buy = 100, Target = 120, Qty = 10, Exit = 110
  // Expected: Potential Target Profit = +200, Actual Profit = +100, Missed Profit = +100
  test('TEST 5: Buy = 100, Target = 120, Qty = 10, Exit = 110', () => {
    const buyPrice = 100;
    const targetPrice = 120;
    const qty = 10;
    const exitPrice = 110;
    
    const potentialProfit = calculatePotentialProfit(buyPrice, targetPrice, qty, 'BUY');
    const actualProfit = calculateRealizedPnL(buyPrice, exitPrice, qty, 'BUY');
    const { missedProfit, extraProfit } = calculateMissedProfit(buyPrice, targetPrice, exitPrice, qty, 'BUY');
    
    expect(potentialProfit).toBeCloseTo(200, 2);
    expect(actualProfit).toBeCloseTo(100, 2);
    expect(missedProfit).toBeCloseTo(100, 2);
    expect(extraProfit).toBeCloseTo(0, 2);
  });

  // TEST 6
  // Buy = 100, Target = 120, Qty = 10, Exit = 130
  // Expected: Potential Target Profit = +200, Actual Profit = +300, Extra Profit = +100, Missed Profit = 0
  test('TEST 6: Buy = 100, Target = 120, Qty = 10, Exit = 130', () => {
    const buyPrice = 100;
    const targetPrice = 120;
    const qty = 10;
    const exitPrice = 130;
    
    const potentialProfit = calculatePotentialProfit(buyPrice, targetPrice, qty, 'BUY');
    const actualProfit = calculateRealizedPnL(buyPrice, exitPrice, qty, 'BUY');
    const { missedProfit, extraProfit } = calculateMissedProfit(buyPrice, targetPrice, exitPrice, qty, 'BUY');
    
    expect(potentialProfit).toBeCloseTo(200, 2);
    expect(actualProfit).toBeCloseTo(300, 2);
    expect(missedProfit).toBeCloseTo(0, 2);
    expect(extraProfit).toBeCloseTo(100, 2);
  });

  // TEST 7
  // Buy = 100, CMP = 100, Qty = 10
  // Expected: P&L = 0.00, Return = 0.00%, No "-0.00"
  test('TEST 7: Buy = 100, CMP = 100, Qty = 10', () => {
    const buyPrice = 100;
    const cmp = 100;
    const qty = 10;
    const pnl = calculateLivePnL(buyPrice, cmp, qty, 'BUY');
    const ret = calculateReturnPct(buyPrice, cmp, 'BUY');
    
    expect(pnl).toBe(0);
    expect(ret).toBe(0);
    expect(formatDecimal(pnl)).toBe('0.00');
    expect(formatDecimal(ret)).toBe('0.00');
  });
});
