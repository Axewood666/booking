BEGIN;

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  total_seats INT NOT NULL CHECK (total_seats >= 0)
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id),
  user_id VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

INSERT INTO events (
	name,
	total_seats
) VALUES ('first_test', 2);

INSERT INTO events (
	name,
	total_seats
) VALUES ('second_test', 1);

INSERT INTO events (
	name,
	total_seats
) VALUES ('third_test', 2);

INSERT INTO bookings(event_id, user_id)
VALUES (3, 'user321');

COMMIT;