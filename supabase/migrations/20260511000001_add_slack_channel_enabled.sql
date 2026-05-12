-- Add enabled column to app_slack_channels for toggling channel sync
alter table app_slack_channels
add column if not exists enabled boolean default true;

-- Update existing rows to be enabled
update app_slack_channels set enabled = true where enabled is null;
