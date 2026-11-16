'use client';

import React, { useState } from 'react';
import { Client, Product, Project } from '@/types/domain';
import { Check, X } from 'lucide-react';

interface HierarchyCreateModalProps {
  entityType: 'PRODUTO' | 'CLIENTE' | 'PROJETO';
  products: Product[];
  clients: Client[];
  defaultProductId?: string | null;
  defaultClientId?: string | null;
  onClose: () => void;
  onCreateProduct: (product: Product) => void;
  onCreateClient: (client: Client) => void;
  onCreateProject: (project: Project) => void;
  onSwitchType?: (type: 'PRODUTO' | 'CLIENTE' | 'PROJETO') => void;
}

export function HierarchyCreateModal({
  entityType,
  products,
  clients,
  defaultProductId,
  defaultClientId,
  onClose,
  onCreateProduct,
  onCreateClient,
  onCreateProject,
  onSwitchType,
}: HierarchyCreateModalProps) {
  const initialProdId =
    defaultProductId && products.some((p) => p.id === defaultProductId)
      ? defaultProductId
      : products[0]?.id ?? '';

  const [productId, setProductId] = useState<string>(initialProdId);
  const availableClients = clients.filter((c) => c.productId === productId);
  const initialCliId =
    defaultClientId && availableClients.some((c) => c.id === defaultClientId)
      ? defaultClientId
      : availableClients[0]?.id ?? '';

  const [clientId, setClientId] = useState<string>(initialCliId);
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [secondaryField, setSecondaryField] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    const nextCli = clients.filter((c) => c.productId === newProdId);
    setClientId(nextCli[0]?.id ?? '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();

    if (entityType === 'PRODUTO') {
      onCreateProduct({
        id: `prod-${Date.now()}`,
        code: code.trim().toUpperCase() || `PRD-${Math.floor(100 + Math.random() * 899)}`,
        name: name.trim(),
        category: secondaryField.trim() || 'Geral',
        description: description.trim(),
        leadEngineer: '',
        createdAt: now,
      });
    } else if (entityType === 'CLIENTE') {
      if (!productId) return;
      onCreateClient({
        id: `cli-${Date.now()}`,
        productId,
        code: code.trim().toUpperCase() || `CLI-${Math.floor(100 + Math.random() * 899)}`,
        name: name.trim(),
        segment: secondaryField.trim() || 'Geral',
        tier: 'Enterprise',
        accountManager: '',
        createdAt: now,
      });
    } else if (entityType === 'PROJETO') {
      if (!productId || !clientId) return;
      onCreateProject({
        id: `proj-${Date.now()}`,
        productId,
        clientId,
        code: code.trim().toUpperCase() || `PRJ-${Math.floor(100 + Math.random() * 899)}`,
        name: name.trim(),
        objective: description.trim(),
        squad: secondaryField.trim() || '',
        createdAt: now,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-100">
            Novo {entityType === 'PRODUTO' ? 'Produto' : entityType === 'CLIENTE' ? 'Cliente' : 'Projeto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {entityType === 'CLIENTE' && products.length === 0 && (
            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <p className="mb-2">Nenhum produto cadastrado ainda. Cadastre um produto primeiro.</p>
              <button
                type="button"
                onClick={() => onSwitchType && onSwitchType('PRODUTO')}
                className="px-3 py-1.5 rounded bg-emerald-500 text-black font-semibold"
              >
                + Cadastrar Produto
              </button>
            </div>
          )}

          {entityType === 'PROJETO' && (products.length === 0 || clients.length === 0) && (
            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <p className="mb-2">
                {products.length === 0
                  ? 'Cadastre um produto primeiro.'
                  : 'Cadastre um cliente vinculado a este produto primeiro.'}
              </p>
              <button
                type="button"
                onClick={() =>
                  onSwitchType &&
                  onSwitchType(products.length === 0 ? 'PRODUTO' : 'CLIENTE')
                }
                className="px-3 py-1.5 rounded bg-emerald-500 text-black font-semibold"
              >
                + Cadastrar {products.length === 0 ? 'Produto' : 'Cliente'}
              </button>
            </div>
          )}

          {entityType !== 'PRODUTO' && products.length > 0 && (
            <div>
              <label className="block text-zinc-400 mb-1">Produto</label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {entityType === 'PROJETO' && products.length > 0 && availableClients.length > 0 && (
            <div>
              <label className="block text-zinc-400 mb-1">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-zinc-400 mb-1">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: PRD-01"
                className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-zinc-400 mb-1">Nome *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome..."
                className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">
              {entityType === 'PRODUTO'
                ? 'Categoria'
                : entityType === 'CLIENTE'
                ? 'Segmento'
                : 'Squad / Responsável'}
            </label>
            <input
              type="text"
              value={secondaryField}
              onChange={(e) => setSecondaryField(e.target.value)}
              placeholder="Opcional..."
              className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional..."
              className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                (entityType === 'CLIENTE' && products.length === 0) ||
                (entityType === 'PROJETO' && (products.length === 0 || availableClients.length === 0))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
