# Database Schema Updates for Supabase

## Required Changes to `extracted_insights` Table

Add a new column to store the person who mentioned the pain point:

```sql
-- Add person_mentioned column to extracted_insights table
ALTER TABLE public.extracted_insights
ADD COLUMN person_mentioned TEXT;

-- Optional: Add a comment to document the field
COMMENT ON COLUMN public.extracted_insights.person_mentioned IS 'Name of the person who mentioned this pain point in the call transcript';
```

## Updated Schema Reference

After applying the update, the `extracted_insights` table will have:

```sql
CREATE TABLE public.extracted_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  call_id uuid,
  pain_point_description text NOT NULL,
  raw_quote text,
  urgency_level integer CHECK (urgency_level >= 1 AND urgency_level <= 5),
  mentioned_timeline text,
  follow_up_date timestamp with time zone,
  status text DEFAULT 'pending'::text,
  person_mentioned text,  -- NEW COLUMN
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT extracted_insights_pkey PRIMARY KEY (id),
  CONSTRAINT extracted_insights_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id)
);
```

## Notes

- `person_mentioned` is optional (nullable) since not all pain points may have a clear person attribution
- The `call_date` from the `calls` table can be used for "Date mentioned" via JOIN
- All other fields remain unchanged
