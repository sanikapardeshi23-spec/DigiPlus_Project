"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/lib/store/workspace-context";
import { formatDate } from "@/lib/utils";
import { KnowledgeDocument } from "@/types";

export default function KnowledgePage() {
  const { knowledgeDocs, addKnowledgeDoc, deleteKnowledgeDoc, settings } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(
    knowledgeDocs[0] || null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [tagsInput, setTagsInput] = useState("architecture, claude");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");

  const categories = Array.from(new Set(knowledgeDocs.map((d) => d.category)));

  const filteredDocs = knowledgeDocs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!content.trim()) {
      setFormError("Content is required");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newDoc = addKnowledgeDoc({
      title: title.trim(),
      category: category.trim(),
      tags: tags.length > 0 ? tags : ["general"],
      content: content.trim(),
      author: settings.userName,
    });

    setTitle("");
    setContent("");
    setTagsInput("");
    setFormError("");
    setCreateDialogOpen(false);
    setSelectedDoc(newDoc);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteKnowledgeDoc(id);
      if (selectedDoc?.id === id) {
        setSelectedDoc(knowledgeDocs.find((d) => d.id !== id) || null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Knowledge Base & Project Docs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of architectural patterns, decisions, and meeting summaries.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="text-xs bg-sky-600 hover:bg-sky-700 text-white self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Knowledge Note</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by keyword, tag, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Category:</span>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-40 text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Main Split Layout: Document Index & Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No documents found"
              description="No documents match your query. Add a knowledge document to store team notes."
              actionLabel="Add Document"
              onAction={() => setCreateDialogOpen(true)}
            />
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/40 shadow-xs ring-1 ring-sky-500"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {doc.title}
                    </h3>
                    <Badge variant="secondary" className="shrink-0 text-[10.5px]">
                      {doc.category}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {doc.content}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap mt-3">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>By {doc.author}</span>
                    <span>Updated {formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Reader (7 cols) */}
        <div className="lg:col-span-7">
          {selectedDoc ? (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      {selectedDoc.category}
                    </span>
                    <CardTitle className="text-lg mt-2">{selectedDoc.title}</CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                      Authored by {selectedDoc.author} • Last modified {formatDate(selectedDoc.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 bg-white"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `${selectedDoc.title}\n\n${selectedDoc.content}`
                        );
                        alert("Document content copied to clipboard!");
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleDelete(selectedDoc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  {selectedDoc.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="prose prose-slate max-w-none text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedDoc.content}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-white/60 p-6 text-center">
              <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Select a Document</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Click any knowledge note from the left to read its full content or copy text.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Document Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <form onSubmit={handleCreateSubmit}>
          <DialogHeader>
            <DialogTitle>Add Knowledge Note</DialogTitle>
            <DialogDescription>
              Document architectures, guidelines, decisions, or customer insights.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="mb-3 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {formError}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Title *</label>
              <Input
                placeholder="e.g. Next.js App Router Architecture Best Practices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="AI & Intelligence">AI & Intelligence</option>
                  <option value="Product Ops">Product Ops</option>
                  <option value="Design">Design</option>
                  <option value="General">General</option>
                </Select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <Input
                  placeholder="e.g. database, claude, security"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Document Content *</label>
              <Textarea
                placeholder="Write detailed documentation, findings, architectural decisions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700">
              Publish Note
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
