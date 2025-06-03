-- Create session_permissions table
CREATE TABLE IF NOT EXISTS public.session_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.translation_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_permissions_session_id ON public.session_permissions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_permissions_user_id ON public.session_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Set up RLS policies for session_permissions
ALTER TABLE public.session_permissions ENABLE ROW LEVEL SECURITY;

-- Only owners can see who has access to their sessions
CREATE POLICY "Users can view permissions for sessions they own" ON public.session_permissions
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.translation_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can see their own permissions
CREATE POLICY "Users can view their own permissions" ON public.session_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- Only owners can insert new permissions
CREATE POLICY "Only owners can add permissions" ON public.session_permissions
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.translation_sessions WHERE user_id = auth.uid()
    )
  );

-- Only owners can update permissions
CREATE POLICY "Only owners can update permissions" ON public.session_permissions
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM public.translation_sessions WHERE user_id = auth.uid()
    )
  );

-- Only owners can delete permissions
CREATE POLICY "Only owners can delete permissions" ON public.session_permissions
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM public.translation_sessions WHERE user_id = auth.uid()
    )
  );

-- Set up RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update the updated_at column
CREATE TRIGGER update_session_permissions_updated_at
BEFORE UPDATE ON public.session_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();