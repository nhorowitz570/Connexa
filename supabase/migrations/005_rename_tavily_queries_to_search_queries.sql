-- Rename Tavily query tracking column to provider-agnostic search_queries.
ALTER TABLE public.runs RENAME COLUMN tavily_queries TO search_queries;
