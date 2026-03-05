-- Rename 'failed' to 'error' in brief_status
ALTER TYPE brief_status RENAME VALUE 'failed' TO 'error';

-- Rename 'failed' to 'error' in run_status
ALTER TYPE run_status RENAME VALUE 'failed' TO 'error';
