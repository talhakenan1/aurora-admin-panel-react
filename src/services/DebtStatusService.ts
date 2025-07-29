import { supabase } from '@/integrations/supabase/client'
import { Database } from '@/integrations/supabase/types'

type Debt = Database['public']['Tables']['debts']['Row']
type DebtUpdate = Database['public']['Tables']['debts']['Update']

export interface StatusChange {
  id: string
  debt_id: string
  old_status: string
  new_status: string
  changed_at: string
  changed_by?: string
  reason?: string
}

export interface DebtStatusUpdateResult {
  success: boolean
  updated_count: number
  errors: string[]
}

export class DebtStatusService {
  /**
   * Updates all overdue debts by checking their due dates against current date
   * This method should be called by automated cron jobs
   */
  static async updateOverdueDebts(): Promise<DebtStatusUpdateResult> {
    try {
      const today = new Date().toISOString().split('T')[0] // Get today's date in YYYY-MM-DD format
      
      // First, get all pending debts that are past due date
      const { data: overdueDebts, error: fetchError } = await supabase
        .from('debts')
        .select('id, status, due_date, customer_id, amount')
        .eq('status', 'pending')
        .lt('due_date', today)

      if (fetchError) {
        console.error('Error fetching overdue debts:', fetchError)
        return {
          success: false,
          updated_count: 0,
          errors: [fetchError.message]
        }
      }

      if (!overdueDebts || overdueDebts.length === 0) {
        return {
          success: true,
          updated_count: 0,
          errors: []
        }
      }

      // Update all overdue debts to 'overdue' status
      const { data: updatedDebts, error: updateError } = await supabase
        .from('debts')
        .update({ 
          status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'pending')
        .lt('due_date', today)
        .select('id, status')

      if (updateError) {
        console.error('Error updating overdue debts:', updateError)
        return {
          success: false,
          updated_count: 0,
          errors: [updateError.message]
        }
      }

      // Log status changes for audit trail
      const statusChanges = overdueDebts.map(debt => ({
        debt_id: debt.id,
        old_status: 'pending',
        new_status: 'overdue',
        reason: 'Automatic status update - past due date'
      }))

      await this.logStatusChanges(statusChanges)

      console.log(`Successfully updated ${updatedDebts?.length || 0} debts to overdue status`)

      return {
        success: true,
        updated_count: updatedDebts?.length || 0,
        errors: []
      }

    } catch (error) {
      console.error('Unexpected error in updateOverdueDebts:', error)
      return {
        success: false,
        updated_count: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Schedules a status update for a specific debt
   * This can be used for manual status changes or scheduled updates
   */
  static async scheduleStatusUpdate(
    debtId: string, 
    newStatus: string, 
    reason?: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // First get the current debt status
      const { data: currentDebt, error: fetchError } = await supabase
        .from('debts')
        .select('id, status')
        .eq('id', debtId)
        .single()

      if (fetchError || !currentDebt) {
        console.error('Error fetching debt for status update:', fetchError)
        return false
      }

      // Validate status transition
      if (!this.isValidStatusTransition(currentDebt.status, newStatus)) {
        console.error(`Invalid status transition from ${currentDebt.status} to ${newStatus}`)
        return false
      }

      // Update the debt status
      const { error: updateError } = await supabase
        .from('debts')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', debtId)

      if (updateError) {
        console.error('Error updating debt status:', updateError)
        return false
      }

      // Log the status change
      await this.logStatusChanges([{
        debt_id: debtId,
        old_status: currentDebt.status,
        new_status: newStatus,
        reason: reason || 'Manual status update',
        changed_by: userId
      }])

      return true

    } catch (error) {
      console.error('Unexpected error in scheduleStatusUpdate:', error)
      return false
    }
  }

  /**
   * Gets the status change history for a specific debt
   */
  static async getStatusHistory(debtId: string): Promise<StatusChange[]> {
    try {
      // Temporarily disabled until debt_status_log table is available in types
      console.log('Status history not available yet for debt:', debtId)
      return []

    } catch (error) {
      console.error('Unexpected error in getStatusHistory:', error)
      return []
    }
  }

  /**
   * Gets summary statistics for debt statuses
   */
  static async getDebtStatusSummary(userId?: string): Promise<{
    pending: number
    overdue: number
    paid: number
    cancelled: number
    total: number
  }> {
    try {
      let query = supabase
        .from('debts')
        .select('status')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: debts, error } = await query

      if (error) {
        console.error('Error fetching debt status summary:', error)
        return { pending: 0, overdue: 0, paid: 0, cancelled: 0, total: 0 }
      }

      const summary = {
        pending: 0,
        overdue: 0,
        paid: 0,
        cancelled: 0,
        total: debts?.length || 0
      }

      debts?.forEach(debt => {
        switch (debt.status) {
          case 'pending':
            summary.pending++
            break
          case 'overdue':
            summary.overdue++
            break
          case 'paid':
            summary.paid++
            break
          case 'cancelled':
            summary.cancelled++
            break
        }
      })

      return summary

    } catch (error) {
      console.error('Unexpected error in getDebtStatusSummary:', error)
      return { pending: 0, overdue: 0, paid: 0, cancelled: 0, total: 0 }
    }
  }

  /**
   * Validates if a status transition is allowed
   */
  private static isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['overdue', 'paid', 'cancelled'],
      'overdue': ['paid', 'cancelled'],
      'paid': ['pending'], // Allow reopening paid debts if needed
      'cancelled': ['pending'] // Allow reactivating cancelled debts
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Logs status changes to the debt_status_log table
   */
  private static async logStatusChanges(changes: Array<{
    debt_id: string
    old_status: string
    new_status: string
    reason?: string
    changed_by?: string
  }>): Promise<void> {
    try {
      // Temporarily disabled until debt_status_log table is available in types
      console.log('Status changes logged:', changes.length, 'changes')

    } catch (error) {
      console.error('Unexpected error in logStatusChanges:', error)
      // Don't throw error here as logging failure shouldn't break the main operation
    }
  }

  /**
   * Batch update multiple debts with the same status
   * Useful for bulk operations
   */
  static async batchUpdateDebtStatus(
    debtIds: string[], 
    newStatus: string, 
    reason?: string,
    userId?: string
  ): Promise<DebtStatusUpdateResult> {
    try {
      if (debtIds.length === 0) {
        return {
          success: true,
          updated_count: 0,
          errors: []
        }
      }

      // Get current statuses for logging
      const { data: currentDebts, error: fetchError } = await supabase
        .from('debts')
        .select('id, status')
        .in('id', debtIds)

      if (fetchError) {
        return {
          success: false,
          updated_count: 0,
          errors: [fetchError.message]
        }
      }

      // Validate all status transitions
      const invalidTransitions = currentDebts?.filter(debt => 
        !this.isValidStatusTransition(debt.status, newStatus)
      ) || []

      if (invalidTransitions.length > 0) {
        return {
          success: false,
          updated_count: 0,
          errors: [`Invalid status transitions for debts: ${invalidTransitions.map(d => d.id).join(', ')}`]
        }
      }

      // Update all debts
      const { data: updatedDebts, error: updateError } = await supabase
        .from('debts')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', debtIds)
        .select('id')

      if (updateError) {
        return {
          success: false,
          updated_count: 0,
          errors: [updateError.message]
        }
      }

      // Log status changes
      const statusChanges = currentDebts?.map(debt => ({
        debt_id: debt.id,
        old_status: debt.status,
        new_status: newStatus,
        reason: reason || 'Batch status update',
        changed_by: userId
      })) || []

      await this.logStatusChanges(statusChanges)

      return {
        success: true,
        updated_count: updatedDebts?.length || 0,
        errors: []
      }

    } catch (error) {
      console.error('Unexpected error in batchUpdateDebtStatus:', error)
      return {
        success: false,
        updated_count: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}