ALTER TABLE public.patients
  ADD COLUMN postal_code text CHECK (postal_code IS NULL OR char_length(postal_code) <= 12),
  ADD COLUMN street text CHECK (street IS NULL OR char_length(street) <= 160),
  ADD COLUMN number text CHECK (number IS NULL OR char_length(number) <= 20),
  ADD COLUMN complement text CHECK (complement IS NULL OR char_length(complement) <= 80),
  ADD COLUMN city text CHECK (city IS NULL OR char_length(city) <= 80),
  ADD COLUMN state text CHECK (state IS NULL OR char_length(state) <= 2);
