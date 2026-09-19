"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem } from "@/types/database";

type FormData = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  minimum_stock: number;
};

const emptyForm: FormData = {
  name: "",
  category: "",
  quantity: 0,
  unit: "",
  price_per_unit: 0,
  minimum_stock: 0,
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name");
    setItems(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      price_per_unit: item.price_per_unit,
      minimum_stock: item.minimum_stock,
    });
    setError("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/inventory/${editId}` : "/api/inventory";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to save item");
      setSubmitting(false);
      return;
    }

    cancelForm();
    loadItems();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to delete item");
      return;
    }

    loadItems();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory Control</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          + Add Item
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4"
        >
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              placeholder="Item Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Quantity"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) })
              }
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Unit (e.g. pcs, bottles, boxes)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Price per Unit (₹)"
              type="number"
              min={0}
              step="0.01"
              value={form.price_per_unit}
              onChange={(e) =>
                setForm({
                  ...form,
                  price_per_unit: Number(e.target.value),
                })
              }
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Minimum Stock Level"
              type="number"
              min={0}
              value={form.minimum_stock}
              onChange={(e) =>
                setForm({
                  ...form,
                  minimum_stock: Number(e.target.value),
                })
              }
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : editId
                  ? "Update Item"
                  : "Create Item"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-muted-foreground">
          Loading inventory...
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Qty</th>
                <th className="px-4 py-3 text-left font-medium">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.category}
                  </td>
                  <td className="px-4 py-3">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3">₹{item.price_per_unit}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        item.quantity <= item.minimum_stock
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {item.quantity <= item.minimum_stock
                        ? "Low Stock"
                        : "In Stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No inventory items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
