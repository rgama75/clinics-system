ALTER TABLE public.appointments
  ADD COLUMN procedure text CHECK (procedure IS NULL OR char_length(procedure) <= 200);
