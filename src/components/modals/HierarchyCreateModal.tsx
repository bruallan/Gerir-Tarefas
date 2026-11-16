'use client';

import React, { useState } from 'react';
import { Client, Product, Project } from '@/types/domain';
import { CheckCircle2, FolderPlus, Layers, Users, X } from 'lucide-react';

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
}: HierarchyCreateModalProps) {
  const [productId, setProductId] = useState<string>(
    defaultProductId ?? products[0]?.id ?? ''
  );
  const availableClients = clients.filter((c) => c.productId === productId);
  const [clientId, setClientId] = useState<string>(
    defaultClientId ?? availableClients[0]?.id ?? ''
  );

  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [secondaryField, setSecondaryField] = useState<string>('');
  const [descriptionOrObjective, setDescriptionOrObjective] =
    useState<string>('');
  const [tier, setTier] = useState<'Enterprise' | 'Mid-Market' | 'Growth'>(
    'Enterprise'
  );

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
        code:
          code.trim().toUpperCase() ||
          `PRD-${Math.floor(10 + Math.random() * 89)}`,
        name: name.trim(),
        category: secondaryField.trim() || 'Plataforma Core',
        description:
          descriptionOrObjective.trim() || 'Produto cadastrado via Funil Meta Ads.',
        leadEngineer: 'Eng. Responsável',
        createdAt: now,
      });
    } else if (entityType === 'CLIENTE') {
      if (!productId) return;
      onCreateClient({
        id: `cli-${Date.now()}`,
        productId,
        code:
          code.trim().toUpperCase() ||
          `CLI-${Math.floor(10 + Math.random() * 89)}`,
        name: name.trim(),
        segment: secondaryField.trim() || 'Tecnologia & Finanças',
        tier,
        accountManager: descriptionOrObjective.trim() || 'Key Account Lead',
        createdAt: now,
      });
    } else if (entityType === 'PROJETO') {
      if (!productId || !clientId) return;
      onCreateProject({
        id: `proj-${Date.now()}`,
        productId,
        clientId,
        code:
          code.trim().toUpperCase() ||
          `PRJ-${Math.floor(10 + Math.random() * 89)}`,
        name: name.trim(),
        objective:
          descriptionOrObjective.trim() || 'Entrega estratégica com SLA monitorado.',
        squad: secondaryField.trim() || 'Squad Core',
        createdAt: now,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0b0d13] border border-zinc-800 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-[#0f131c] border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            {entityType === 'PRODUTO' && (
              <Layers className="w-4 h-4 text-emerald-400" />
            )}
            {entityType === 'CLIENTE' && (
              <Users className="w-4 h-4 text-emerald-400" />
            )}
            {entityType === 'PROJETO' && (
              <FolderPlus className="w-4 h-4 text-emerald-400" />
            )}
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-100">
              Novo {entityType} no Funil
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {entityType !== 'PRODUTO' && (
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Produto Vinculado *
              </label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {entityType === 'PROJETO' && (
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Cliente Vinculado *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Código
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={
                  entityType === 'PRODUTO'
                    ? 'PRD-NEW'
                    : entityType === 'CLIENTE'
                    ? 'CLI-NEW'
                    : 'PRJ-NEW'
                }
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                Nome do {entityType} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Digite o nome do ${entityType.toLowerCase()}...`}
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                {entityType === 'PRODUTO'
                  ? 'Categoria Tecnológica'
                  : entityType === 'CLIENTE'
                  ? 'Segmento de Mercado'
                  : 'Squad Responsável'}
              </label>
              <input
                type="text"
                value={secondaryField}
                onChange={(e) => setSecondaryField(e.target.value)}
                placeholder={
                  entityType === 'PRODUTO'
                    ? 'Ex: Core SaaS / AI'
                    : entityType === 'CLIENTE'
                    ? 'Ex: Bancos & Fintechs'
                    : 'Ex: Squad Alpha'
                }
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {entityType === 'CLIENTE' && (
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                  Tier do Cliente
                </label>
                <select
                  value={tier}
                  onChange={(e) =>
                    setTier(
                      e.target.value as 'Enterprise' | 'Mid-Market' | 'Growth'
                    )
                  }
                  className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Mid-Market">Mid-Market</option>
                  <option value="Growth">Growth</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              {entityType === 'CLIENTE'
                ? 'Account Manager'
                : 'Descrição / Objetivo Estratégico'}
            </label>
            <textarea
              rows={2}
              value={descriptionOrObjective}
              onChange={(e) => setDescriptionOrObjective(e.target.value)}
              placeholder={
                entityType === 'CLIENTE'
                  ? 'Nome do executivo da conta...'
                  : 'Detalhe o escopo ou objetivo...'
              }
              className="w-full bg-[#07090d] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-zinc-700 text-xs font-mono text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Adicionar {entityType}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
