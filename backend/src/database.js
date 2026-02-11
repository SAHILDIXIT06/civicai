import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not configured. Database operations will fail.');
  console.warn('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

// Helper to convert camelCase to snake_case
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};

// Complaints Database Operations
export const complaintsDB = {
  async getAll() {
    if (!supabase) {
      console.error('❌ Supabase client not initialized!');
      throw new Error('Database not configured');
    }
    
    console.log('🔍 Querying Supabase for complaints...');
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    console.log(`✅ Query successful, ${data?.length || 0} rows returned`);
    return data.map(toCamelCase);
  },

  async getById(id) {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data ? toCamelCase(data) : null;
  },

  async getByPhone(userPhone) {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_phone', userPhone)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(toCamelCase);
  },

  async getByStatus(status) {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(toCamelCase);
  },

  async create(complaint) {
    if (!supabase) throw new Error('Database not configured');
    const snakeComplaint = toSnakeCase(complaint);
    const { data, error } = await supabase
      .from('complaints')
      .insert([snakeComplaint])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async update(id, updates) {
    if (!supabase) throw new Error('Database not configured');
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('complaints')
      .update(snakeUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async delete(id) {
    if (!supabase) throw new Error('Database not configured');
    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Admins Database Operations
export const adminsDB = {
  async getAll() {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('added_at', { ascending: false });
    
    if (error) throw error;
    return data.map(toCamelCase);
  },

  async getByPhone(phone) {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data ? toCamelCase(data) : null;
  },

  async create(admin) {
    if (!supabase) throw new Error('Database not configured');
    const snakeAdmin = toSnakeCase(admin);
    const { data, error } = await supabase
      .from('admins')
      .insert([snakeAdmin])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async update(phone, updates) {
    if (!supabase) throw new Error('Database not configured');
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('admins')
      .update(snakeUpdates)
      .eq('phone', phone)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async delete(phone) {
    if (!supabase) throw new Error('Database not configured');
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('phone', phone);
    
    if (error) throw error;
    return true;
  },

  async isAdmin(phone) {
    const admin = await this.getByPhone(phone);
    return admin !== null;
  }
};

// Departments Database Operations
export const departmentsDB = {
  async getAll() {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data.map(toCamelCase);
  },

  async getById(id) {
    if (!supabase) throw new Error('Database not configured');
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : null;
  },

  async create(department) {
    if (!supabase) throw new Error('Database not configured');
    const snakeDepartment = toSnakeCase(department);
    const { data, error } = await supabase
      .from('departments')
      .insert([snakeDepartment])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  },

  async update(id, updates) {
    if (!supabase) throw new Error('Database not configured');
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('departments')
      .update(snakeUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  }
};

export default { complaintsDB, adminsDB, departmentsDB, supabase };
