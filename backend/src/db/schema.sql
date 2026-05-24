-- ============================================================
-- DrippyCutz Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(20) NOT NULL DEFAULT 'customer',
  avatar_url    VARCHAR(500),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- BARBER PROFILES
-- ============================================================
CREATE TABLE barbers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio                  TEXT,
  instagram            VARCHAR(255),
  years_exp            INTEGER DEFAULT 0,
  is_active            BOOLEAN DEFAULT true,
  latitude             DECIMAL(9,6),
  longitude            DECIMAL(9,6),
  address              VARCHAR(500),
  cancellation_policy  TEXT,
  cancellation_hours   INTEGER DEFAULT 24,
  no_show_fee          DECIMAL(10,2) DEFAULT 0
);

-- ============================================================
-- BARBER PORTFOLIO PHOTOS
-- ============================================================
CREATE TABLE barber_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  photo_url   VARCHAR(500) NOT NULL,
  caption     VARCHAR(255),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id     UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  duration_mins INTEGER NOT NULL,
  category      VARCHAR(100),
  is_active     BOOLEAN DEFAULT true
);

-- ============================================================
-- AVAILABILITY
-- ============================================================
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL
);

-- ============================================================
-- PRICING RULES (SURGE PRICING)
-- ============================================================
CREATE TABLE pricing_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  label       VARCHAR(100),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  surcharge   DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID NOT NULL REFERENCES users(id),
  barber_id                 UUID NOT NULL REFERENCES barbers(id),
  service_id                UUID NOT NULL REFERENCES services(id),
  start_time                TIMESTAMP NOT NULL,
  end_time                  TIMESTAMP NOT NULL,
  status                    VARCHAR(20) DEFAULT 'pending',
  notes                     TEXT,
  stripe_payment_intent_id  VARCHAR(255),
  deposit_paid              BOOLEAN DEFAULT false,
  total_price               DECIMAL(10,2) NOT NULL,
  surcharge_applied         DECIMAL(10,2) DEFAULT 0,
  is_recurring              BOOLEAN DEFAULT false,
  recurring_rule_id         UUID,
  created_at                TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CLIENT NOTES
-- ============================================================
CREATE TABLE client_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NOT NULL REFERENCES barbers(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  note        TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(barber_id, customer_id)
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id),
  customer_id     UUID NOT NULL REFERENCES users(id),
  barber_id       UUID NOT NULL REFERENCES barbers(id),
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id),
  sender_id       UUID NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  read_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL REFERENCES users(id),
  referred_id   UUID NOT NULL REFERENCES users(id),
  barber_id     UUID REFERENCES barbers(id),
  reward_given  BOOLEAN DEFAULT false,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SOCIAL CONNECTIONS
-- ============================================================
CREATE TABLE social_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id         UUID NOT NULL REFERENCES barbers(id),
  platform          VARCHAR(50) NOT NULL,
  platform_user_id  VARCHAR(255) NOT NULL,
  access_token      TEXT NOT NULL,
  token_expires_at  TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  type          VARCHAR(50) NOT NULL,
  channel       VARCHAR(20) NOT NULL,
  body          TEXT NOT NULL,
  sent_at       TIMESTAMP,
  read_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_appointments_barber_id   ON appointments(barber_id);
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_appointments_start_time  ON appointments(start_time);
CREATE INDEX idx_barbers_location         ON barbers(latitude, longitude);
CREATE INDEX idx_services_category        ON services(category);
CREATE INDEX idx_messages_appointment_id  ON messages(appointment_id);
CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
