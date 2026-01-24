# RefCheck Subscription & Billing Implementation V1

## 1. Plan Definitions

### Free Plan (Default)
This is the entry-level plan for all new users.
- **Quota**: 20 references per month.
- **History**: 7 days retention.
- **Export**: Disabled.
- **Ideal for**: Quick checks, undergraduates.

### Pro Plan ($12/month)
Targeted at PhD students and serious researchers.
- **Quota**: 300 references per month.
- **History**: Permanent retention.
- **Export**: Full access (BibTeX, CSV, RIS).
- **Features**: Priority support, team options.

## 2. Database Schema Updates

We need to track subscription status, current period limits, and Stripe customer IDs.

```sql
-- Subscription tracking table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free', -- 'free' or 'pro'
    status VARCHAR(50) DEFAULT 'active', -- active, past_due, canceled
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly usage tracking
CREATE TABLE IF NOT EXISTS monthly_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    references_processed INTEGER DEFAULT 0,
    export_count INTEGER DEFAULT 0,
    UNIQUE(user_id, year_month) -- One record per user per month
);
```

## 3. Stripe Integration Strategy

### Dependencies
- `stripe`: Node.js library for server-side operations.

### Key Workflows

#### A. Checkout (Upgrade Flow)
1. User clicks "Upgrade" in UI.
2. App calls `/api/create-checkout-session`.
3. Backend creates a Stripe Checkout Session (Subscription Mode).
4. Returns session URL to frontend.
5. Frontend redirects user to Stripe hosted page.

#### B. Portal (Management Flow)
1. User clicks "Manage Subscription".
2. App calls `/api/create-portal-session`.
3. Backend creates Stripe Customer Portal session.
4. Returns URL.
5. Frontend redirects user to Stripe for invoices/cancellation.

#### C. Webhooks (State Sync)
We must listen for these Stripe events:
- `checkout.session.completed`: Provision Pro access.
- `customer.subscription.updated`: Handle renewals or cancellations.
- `customer.subscription.deleted`: Downgrade to Free.
- `invoice.payment_failed`: Handle dunning/past_due states.

## 4. Enforcement Logic (Middleware)

### Quota Check
Before processing any file upload:
1. Identify user's plan.
2. Count current month's usage from `monthly_usage` table.
3. If `(usage + new_refs) > limit`, reject request with `403 Upgrade Required`.

### Export Gate
Before generating export:
1. Check if plan is 'free'.
2. If yes, reject with `403 Upgrade Required`.

## 5. Next Steps for Implementation

1.  **Install Stripe**: `npm install stripe`
2.  **Schema Update**: Run the SQL migration above.
3.  **Backend Routes**: Create `stripe-routes.js` for checkout/portal/webhooks.
4.  **Frontend Integration**: Connect the Pricing page buttons to these new endpoints.
