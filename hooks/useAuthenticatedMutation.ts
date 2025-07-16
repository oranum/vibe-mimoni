import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

export interface AuthenticatedMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useAuthenticatedMutation() {
  const { user } = useAuth();

  const validateAuth = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user;
  };

  const insert = async <T extends Record<string, any>>(
    table: string,
    data: Omit<T, 'user_id' | 'id' | 'created_at' | 'updated_at'>,
    options?: AuthenticatedMutationOptions
  ) => {
    try {
      const authenticatedUser = validateAuth();
      
      const { data: result, error } = await supabase
        .from(table)
        .insert({
          ...data,
          user_id: authenticatedUser.id,
        })
        .select();

      if (error) {
        throw new Error(`Failed to insert into ${table}: ${error.message}`);
      }

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (options?.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  };

  const batchInsert = async <T extends Record<string, any>>(
    table: string,
    dataArray: Omit<T, 'user_id' | 'id' | 'created_at' | 'updated_at'>[],
    options?: AuthenticatedMutationOptions
  ) => {
    try {
      const authenticatedUser = validateAuth();
      
      // Add user_id to each item in the array
      const dataWithUserId = dataArray.map(item => ({
        ...item,
        user_id: authenticatedUser.id,
      }));

      const { data: result, error } = await supabase
        .from(table)
        .insert(dataWithUserId)
        .select();

      if (error) {
        throw new Error(`Failed to batch insert into ${table}: ${error.message}`);
      }

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (options?.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  };

  const update = async <T extends Record<string, any>>(
    table: string,
    id: string,
    data: Partial<Omit<T, 'user_id' | 'id' | 'created_at' | 'updated_at'>>,
    options?: AuthenticatedMutationOptions
  ) => {
    try {
      const authenticatedUser = validateAuth();
      
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .eq('user_id', authenticatedUser.id) // Ensure user can only update their own data
        .select();

      if (error) {
        throw new Error(`Failed to update ${table}: ${error.message}`);
      }

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (options?.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  };

  const remove = async (
    table: string,
    id: string,
    options?: AuthenticatedMutationOptions
  ) => {
    try {
      const authenticatedUser = validateAuth();
      
      const { data: result, error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', authenticatedUser.id) // Ensure user can only delete their own data
        .select();

      if (error) {
        throw new Error(`Failed to delete from ${table}: ${error.message}`);
      }

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (options?.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  };

  return {
    insert,
    batchInsert,
    update,
    remove,
    isAuthenticated: !!user,
    user
  };
} 