-- Round existing monetary values up to whole taka.
-- Product sale unit price and commission rates remain decimal-capable.

UPDATE wholesaler_suppliers SET opening_due = CEIL(opening_due);
UPDATE wholesaler_customers SET opening_due = CEIL(opening_due);

UPDATE supplier_deliveries
SET estimated_value = CEIL(estimated_value),
    advance_paid = CEIL(advance_paid);

UPDATE sales
SET gross_amount = CEIL(gross_amount),
    discount_amount = CEIL(discount_amount),
    net_amount = CEIL(net_amount),
    paid_amount = CEIL(paid_amount),
    due_amount = CEIL(due_amount);

UPDATE sale_items
SET line_total = CEIL(line_total),
    commission_amount = CEIL(commission_amount);

UPDATE payments
SET cash_amount = CEIL(cash_amount),
    previous_due = CEIL(previous_due),
    due_after_payment = CEIL(due_after_payment);

UPDATE supplier_settlements
SET amount = CEIL(amount),
    previous_due = CEIL(previous_due),
    due_after_settlement = CEIL(due_after_settlement);

UPDATE shop_expenses SET amount = CEIL(amount);

UPDATE supplier_expenses
SET amount = CEIL(amount),
    paid_amount = CEIL(paid_amount),
    due_amount = CEIL(due_amount);

UPDATE other_due_balances SET due_amount = CEIL(due_amount);
UPDATE account_balances SET balance = CEIL(balance);
UPDATE account_ledger SET debit = CEIL(debit), credit = CEIL(credit);

UPDATE transactions
SET sale_amount = CEIL(sale_amount),
    payment_amount = CEIL(payment_amount),
    due_amount = CEIL(due_amount);

UPDATE cash_reconciliations
SET opening_cash = CEIL(opening_cash),
    counted_cash = CASE WHEN counted_cash IS NULL THEN NULL ELSE CEIL(counted_cash) END;

UPDATE box_types SET purchase_price = CEIL(purchase_price);
UPDATE box_inventory SET weighted_avg_cost = CEIL(weighted_avg_cost);
UPDATE box_ledger
SET unit_cost_snapshot = CASE WHEN unit_cost_snapshot IS NULL THEN NULL ELSE CEIL(unit_cost_snapshot) END,
    unit_sale_price = CASE WHEN unit_sale_price IS NULL THEN NULL ELSE CEIL(unit_sale_price) END;
