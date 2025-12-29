import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  created_at: string;
}

const expenseCategories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Travel',
  'Other',
];

export default function Expenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food & Dining',
    note: '',
  });

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  async function fetchExpenses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) setExpenses(data);
    if (error) console.error('Error fetching expenses:', error);
    setLoading(false);
  }

  async function createExpense() {
    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('expenses').insert({
      user_id: user!.id,
      amount,
      category: newExpense.category,
      note: newExpense.note.trim() || null,
    });

    if (error) {
      toast({ title: 'Failed to add expense', variant: 'destructive' });
    } else {
      toast({ title: 'Expense added!' });
      setNewExpense({ amount: '', category: 'Food & Dining', note: '' });
      setDialogOpen(false);
      fetchExpenses();
    }
  }

  async function deleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      setExpenses(expenses.filter(e => e.id !== id));
      toast({ title: 'Expense deleted' });
    }
  }

  // Calculate monthly total
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const monthlyTotal = expenses
    .filter(e => new Date(e.created_at) >= startOfMonth)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Expenses"
        description="Track your spending"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="What was this for?"
                    value={newExpense.note}
                    onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={createExpense} className="w-full">
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Monthly Summary */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-muted-foreground mb-1">This Month</p>
          <p className="text-3xl font-semibold tracking-tight">
            ${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>

      {/* Expense List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4">
                <div className="h-12 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : expenses.length > 0 ? (
        <div className="space-y-2 stagger-children">
          {expenses.map((expense) => (
            <Card key={expense.id} className="glass-card hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        ${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{expense.category}</span>
                    </div>
                    {expense.note && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{expense.note}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(expense.created_at), 'MMM d')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteExpense(expense.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={DollarSign}
          title="No expenses yet"
          description="Start tracking your spending"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          }
        />
      )}
    </div>
  );
}
