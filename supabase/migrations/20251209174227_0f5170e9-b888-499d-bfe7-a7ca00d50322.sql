-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('lead', 'non_lead');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'non_lead',
  UNIQUE(user_id, role)
);

-- Create sidebar_sections table
CREATE TABLE public.sidebar_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'folder',
  position INTEGER NOT NULL DEFAULT 0,
  visible_to_all BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create section_help_content table
CREATE TABLE public.section_help_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sidebar_sections(id) ON DELETE CASCADE,
  content TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  period_type TEXT CHECK (period_type IN ('month', 'quarter', 'year', 'custom')),
  start_date DATE,
  end_date DATE,
  total_budget_amount DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create budget_categories table
CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  budgeted_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  vendor TEXT,
  description TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT,
  client_name TEXT,
  invoice_number TEXT,
  issue_date DATE,
  due_date DATE,
  amount DECIMAL(15,2),
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
  linked_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  linked_category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  storage_file_paths TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_categories table
CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'done', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  assignee_user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  due_date DATE,
  related_entity_type TEXT,
  related_entity_id UUID,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT DEFAULT 'general',
  related_entity_type TEXT,
  related_entity_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_sections (for user-created sections)
CREATE TABLE public.custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sidebar_section_id UUID REFERENCES public.sidebar_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_help_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create has_role function for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Leads can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS Policies for sidebar_sections
CREATE POLICY "Everyone can view sections" ON public.sidebar_sections FOR SELECT TO authenticated USING (visible_to_all = true OR public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Leads can manage sections" ON public.sidebar_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for section_help_content
CREATE POLICY "Everyone can view help" ON public.section_help_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads can manage help" ON public.section_help_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for budgets
CREATE POLICY "Users can view budgets" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads can manage budgets" ON public.budgets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for budget_categories
CREATE POLICY "Users can view categories" ON public.budget_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads can manage categories" ON public.budget_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads can manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Users can create own expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (assigned_user_id = auth.uid() OR public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Leads can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Assigned users can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (assigned_user_id = auth.uid());

-- RLS Policies for task_categories
CREATE POLICY "Users can view task categories" ON public.task_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads can manage task categories" ON public.task_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for tasks
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT TO authenticated USING (assignee_user_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Leads can manage all tasks" ON public.tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Users can update assigned tasks" ON public.tasks FOR UPDATE TO authenticated USING (assignee_user_id = auth.uid());
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- RLS Policies for notes
CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'lead'));
CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Leads can manage all notes" ON public.notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for custom_sections
CREATE POLICY "Users can view custom sections" ON public.custom_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads can manage custom sections" ON public.custom_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'lead'));

-- RLS Policies for activity_log
CREATE POLICY "Leads can view activity log" ON public.activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'lead'));
CREATE POLICY "System can insert logs" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- First user becomes lead, others are non_lead
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'lead');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'non_lead');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default sidebar sections
INSERT INTO public.sidebar_sections (name, slug, icon, position, is_system, visible_to_all) VALUES
  ('Dashboard', 'dashboard', 'layout-dashboard', 0, true, true),
  ('Budgets', 'budgets', 'wallet', 1, true, true),
  ('Invoices', 'invoices', 'file-text', 2, true, true),
  ('Tasks', 'tasks', 'check-square', 3, true, true),
  ('Notes', 'notes', 'sticky-note', 4, true, true),
  ('Team', 'team', 'users', 5, true, false),
  ('Settings', 'settings', 'settings', 6, true, false);