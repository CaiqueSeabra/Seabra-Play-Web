import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Camera, PlaySquare, Trash2, Download, Filter, Clock, SortAsc, Image as ImageIcon, Upload, Loader2, FolderPlus, Folder as FolderIcon, Edit2 } from 'lucide-react';

// Initialize Gemini (Suporta tanto o preview local quanto o Render/Vite)
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
const ai = new GoogleGenAI({ apiKey: apiKey as string });

// Types
interface Video {
  videoId: string;
  title: string;
  channelName: string;
  folderId?: string;
  thumbnail: string;
  addedAt: string;
}

interface Folder {
  id: string;
  name: string;
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'playlist' | 'analyze'>('playlist');

  // Playlist State
  const [playlist, setPlaylist] = useState<Video[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [currentSort, setCurrentSort] = useState('recent');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('default');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals State
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState('');
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isDeleteFolderConfirmOpen, setIsDeleteFolderConfirmOpen] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState('');

  // Gemini State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('Analise esta imagem em detalhes e descreva o que você vê.');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Load playlist and folders on mount
  useEffect(() => {
    const savedPlaylist = localStorage.getItem('nexusPlaylist');
    if (savedPlaylist) {
      setPlaylist(JSON.parse(savedPlaylist));
    } else {
      // Add examples
      const examples = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', '9bZkp7q19f0'];
      const initialPlaylist = examples.map(id => ({
        videoId: id,
        title: generateTitle(id),
        channelName: generateChannelName(id),
        folderId: 'default',
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        addedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));
      setPlaylist(initialPlaylist);
      localStorage.setItem('nexusPlaylist', JSON.stringify(initialPlaylist));
    }

    const savedFolders = localStorage.getItem('nexusFolders');
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
    } else {
      const initialFolders = [
        { id: 'default', name: 'Geral' },
        { id: 'teclado', name: 'Aula de Teclado' },
        { id: 'violao', name: 'Aula de Violão' },
        { id: 'culinaria', name: 'Culinária' }
      ];
      setFolders(initialFolders);
      localStorage.setItem('nexusFolders', JSON.stringify(initialFolders));
    }
  }, []);

  // Save playlist on change
  useEffect(() => {
    if (playlist.length > 0) {
      localStorage.setItem('nexusPlaylist', JSON.stringify(playlist));
    }
  }, [playlist]);

  // Save folders on change
  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem('nexusFolders', JSON.stringify(folders));
    }
  }, [folders]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- PLAYLIST FUNCTIONS ---
  const extractVideoId = (url: string) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const generateChannelName = (videoId: string) => {
    const channels = ['TECH NEXUS', 'CYBER DEV', 'FUTURE LAB', 'NEON CODE', 'QUANTUM TECH', 'DIGITAL EDGE', 'SYNTHWAVE', 'CYBERPUNK', 'NEURAL NET'];
    const index = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % channels.length;
    return channels[index];
  };

  const generateTitle = (videoId: string) => {
    const titles = ['Como Criar Playlists Inteligentes', 'Tutorial Avançado de Programação', 'Design Futurista na Prática', 'Hacks de Produtividade 2024', 'Inteligência Artificial Explicada', 'Desenvolvimento Web Moderno', 'UX/UI Design para Iniciantes', 'Machine Learning do Zero'];
    const index = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % titles.length;
    return `${titles[index]} #${videoId.substring(0, 4).toUpperCase()}`;
  };

  const openCreateFolderModal = () => {
    setNewFolderName('');
    setIsCreateFolderModalOpen(true);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder = { id: Date.now().toString(), name: newFolderName.trim() };
      setFolders(prev => [...prev, newFolder]);
      setSelectedFolderId(newFolder.id);
      showToast(`📁 PASTA CRIADA: ${newFolder.name}`);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    }
  };

  const openEditFolderModal = (folder: Folder) => {
    if (folder.id === 'default') return;
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setIsEditFolderModalOpen(true);
  };

  const handleEditFolder = () => {
    if (editingFolderName.trim() && editingFolderId) {
      setFolders(prev => prev.map(f => f.id === editingFolderId ? { ...f, name: editingFolderName.trim() } : f));
      showToast(`📁 PASTA ATUALIZADA`);
      setIsEditFolderModalOpen(false);
    }
  };

  const openDeleteFolderConfirm = (folderId: string) => {
    if (folderId === 'default') return;
    setDeletingFolderId(folderId);
    setIsDeleteFolderConfirmOpen(true);
  };

  const handleDeleteFolder = () => {
    if (deletingFolderId) {
      // Move videos to default folder
      setPlaylist(prev => prev.map(v => v.folderId === deletingFolderId ? { ...v, folderId: 'default' } : v));
      // Remove folder
      setFolders(prev => prev.filter(f => f.id !== deletingFolderId));
      
      // Reset filters if needed
      if (currentFilter === deletingFolderId) setCurrentFilter('all');
      if (selectedFolderId === deletingFolderId) setSelectedFolderId('default');
      
      showToast(`🗑️ PASTA REMOVIDA`);
      setIsDeleteFolderConfirmOpen(false);
    }
  };

  const addVideo = () => {
    const url = urlInput.trim();
    if (!url) {
      showToast('⚠️ INSIRA UM LINK DO YOUTUBE', 'error');
      return;
    }
    const videoId = extractVideoId(url);
    if (!videoId) {
      showToast('❌ LINK INVÁLIDO', 'error');
      return;
    }
    if (playlist.some(v => v.videoId === videoId)) {
      showToast('⚠️ VÍDEO JÁ ESTÁ NA PLAYLIST', 'error');
      setUrlInput('');
      return;
    }
    const videoInfo: Video = {
      videoId,
      title: generateTitle(videoId),
      channelName: generateChannelName(videoId),
      folderId: selectedFolderId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      addedAt: new Date().toISOString()
    };
    setPlaylist(prev => [videoInfo, ...prev]);
    setUrlInput('');
    showToast(`✅ VÍDEO ADICIONADO: ${videoInfo.title.substring(0, 30)}...`);
  };

  const removeVideo = (videoId: string) => {
    const video = playlist.find(v => v.videoId === videoId);
    setPlaylist(prev => prev.filter(v => v.videoId !== videoId));
    showToast(`🗑️ REMOVIDO: ${video?.title.substring(0, 30)}...`);
  };

  const clearAll = () => {
    if (playlist.length === 0) {
      showToast('⚠️ PLAYLIST JÁ ESTÁ VAZIA', 'error');
      return;
    }
    setIsClearConfirmOpen(true);
  };

  const confirmClearAll = () => {
    setPlaylist([]);
    localStorage.removeItem('nexusPlaylist');
    setCurrentFilter('all');
    setIsClearConfirmOpen(false);
    showToast('🧹 PLAYLIST LIMPA COM SUCESSO');
  };

  const changeVideoFolder = (videoId: string, newFolderId: string) => {
    setPlaylist(prev => prev.map(v => v.videoId === videoId ? { ...v, folderId: newFolderId } : v));
    showToast(`📁 VÍDEO MOVIDO COM SUCESSO`);
  };

  const exportPlaylist = () => {
    if (playlist.length === 0) {
      showToast('⚠️ PLAYLIST VAZIA', 'error');
      return;
    }
    const data = {
      exportedAt: new Date().toISOString(),
      totalVideos: playlist.length,
      folders: folders,
      playlist: playlist,
      videos: playlist.map(v => ({
        title: v.title,
        channel: v.channelName,
        folder: folders.find(f => f.id === v.folderId)?.name || 'Geral',
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        addedAt: v.addedAt
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seabra-playlist-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`💾 EXPORTADO: ${playlist.length} VÍDEOS`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.playlist && data.folders) {
          setPlaylist(data.playlist);
          setFolders(data.folders);
          showToast('📥 BACKUP IMPORTADO COM SUCESSO');
        } else {
          showToast('❌ ARQUIVO DE BACKUP INVÁLIDO', 'error');
        }
      } catch (error) {
        showToast('❌ ERRO AO LER ARQUIVO', 'error');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const getSortedAndFilteredVideos = () => {
    let filtered = currentFilter === 'all' 
      ? playlist 
      : playlist.filter(v => v.folderId === currentFilter || (!v.folderId && currentFilter === 'default'));
      
    return filtered.sort((a, b) => {
      if (currentSort === 'recent') return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      if (currentSort === 'oldest') return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      if (currentSort === 'title-asc') return a.title.localeCompare(b.title);
      if (currentSort === 'title-desc') return b.title.localeCompare(a.title);
      return 0;
    });
  };

  // --- GEMINI FUNCTIONS ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) {
      showToast('⚠️ POR FAVOR, SELECIONE UMA IMAGEM', 'error');
      return;
    }
    if (!analysisPrompt.trim()) {
      showToast('⚠️ POR FAVOR, INSIRA UM PROMPT', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      const base64Data = imagePreview?.split(',')[1];
      if (!base64Data) throw new Error("Falha ao processar imagem.");

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: imageFile.type } },
            { text: analysisPrompt }
          ]
        }
      });

      setAnalysisResult(response.text || 'Nenhum resultado retornado.');
      showToast('✅ ANÁLISE CONCLUÍDA');
    } catch (error) {
      console.error(error);
      showToast('❌ ERRO NA ANÁLISE', 'error');
      setAnalysisResult('Ocorreu um erro ao analisar a imagem. Verifique o console para mais detalhes.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header Futurista */}
      <header className="cyber-header">
        <div className="logo-container">
          <div className="youtube-neon">
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          </div>
          <div className="logo-text">
            SEABRA<span>PLAY</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div 
            className={`status-badge ${activeTab === 'playlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlist')}
          >
            <span className="status-dot"></span>
            PLAYLIST
          </div>
          <div 
            className={`status-badge ${activeTab === 'analyze' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyze')}
            style={{ borderColor: activeTab === 'analyze' ? '#0088ff' : '', color: activeTab === 'analyze' ? '#0088ff' : '' }}
          >
            <span className="status-dot blue"></span>
            ANALISAR IMAGEM
          </div>
        </div>
      </header>

      {activeTab === 'playlist' && (
        <>
          {/* Painel de Input */}
          <div className="input-panel">
            <div className="input-group" style={{ flexWrap: 'wrap' }}>
              <input 
                type="text" 
                className="cyber-input" 
                placeholder="🎬 COLE O LINK DO YOUTUBE AQUI..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addVideo()}
                autoComplete="off"
                style={{ minWidth: '250px' }}
              />
              <select 
                className="cyber-select" 
                value={selectedFolderId} 
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    openCreateFolderModal();
                  } else {
                    setSelectedFolderId(e.target.value);
                  }
                }}
                style={{ height: '56px', borderRadius: '15px', minWidth: '200px' }}
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id} style={{ background: '#0a0a0f' }}>{f.name}</option>
                ))}
                <option value="new" style={{ background: '#0a0a0f', color: '#ff6b6b' }}>+ CRIAR NOVA PASTA</option>
              </select>
              <button className="cyber-btn" onClick={addVideo}>
                ⚡ ADICIONAR
              </button>
            </div>
            <div className="filter-group">
              <button className={`cyber-btn secondary ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentFilter('all')}>
                🌐 TODOS
              </button>
              <button className={`cyber-btn secondary ${currentSort === 'recent' ? 'active' : ''}`} onClick={() => setCurrentSort('recent')}>
                📅 RECENTES
              </button>
              <button className={`cyber-btn secondary ${currentSort === 'title-asc' ? 'active' : ''}`} onClick={() => setCurrentSort('title-asc')}>
                🔤 A-Z
              </button>
              <button className="cyber-btn secondary" onClick={() => importRef.current?.click()}>
                📥 IMPORTAR
              </button>
              <input 
                type="file" 
                ref={importRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
              <button className="cyber-btn secondary" onClick={exportPlaylist}>
                💾 EXPORTAR
              </button>
              <button className="cyber-btn secondary" onClick={clearAll}>
                🗑️ LIMPAR TUDO
              </button>
            </div>
          </div>

          {/* Layout Principal */}
          <div className="main-layout">
            {/* Sidebar de Pastas */}
            <aside className="cyber-sidebar">
              <div className="sidebar-header">
                <span>📁</span> PASTAS
              </div>
              <ul className="channel-list">
                <li className={`channel-item ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentFilter('all')}>
                  <div className="channel-avatar">🌐</div>
                  <div className="channel-info">
                    <div className="channel-name">TODOS OS VÍDEOS</div>
                    <div className="video-count">{playlist.length} VÍDEOS</div>
                  </div>
                </li>
                {folders.map(folder => {
                  const folderVideos = playlist.filter(v => v.folderId === folder.id || (!v.folderId && folder.id === 'default'));
                  return (
                    <li 
                      key={folder.id}
                      className={`channel-item ${currentFilter === folder.id ? 'active' : ''} group relative`} 
                      onClick={() => setCurrentFilter(folder.id)}
                    >
                      <div className="channel-avatar">{folder.name[0].toUpperCase()}</div>
                      <div className="channel-info">
                        <div className="channel-name">{folder.name}</div>
                        <div className="video-count">{folderVideos.length} VÍDEOS</div>
                      </div>
                      {folder.id !== 'default' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2 bg-black/60 hover:bg-[#0088ff]/30 text-[#0088ff] rounded-lg transition-colors backdrop-blur-md"
                            onClick={(e) => { e.stopPropagation(); openEditFolderModal(folder); }}
                            title="Editar Pasta"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 bg-black/60 hover:bg-[#ff0000]/30 text-[#ff0000] rounded-lg transition-colors backdrop-blur-md"
                            onClick={(e) => { e.stopPropagation(); openDeleteFolderConfirm(folder.id); }}
                            title="Excluir Pasta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Área de Conteúdo */}
            <main className="content-area">
              <div className="content-header">
                <h2 className="content-title">
                  {currentFilter === 'all' ? '🎯 TODOS OS VÍDEOS' : `📁 ${folders.find(f => f.id === currentFilter)?.name || 'Pasta'}`}
                </h2>
                <select className="cyber-select" value={currentSort} onChange={(e) => setCurrentSort(e.target.value)}>
                  <option value="recent">Mais Recentes</option>
                  <option value="oldest">Mais Antigos</option>
                  <option value="title-asc">Título (A-Z)</option>
                  <option value="title-desc">Título (Z-A)</option>
                </select>
              </div>
              
              <div className="video-grid">
                {getSortedAndFilteredVideos().length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                    <div className="empty-icon text-6xl mb-4">🎬</div>
                    <h3 className="text-xl font-bold">PASTA VAZIA</h3>
                    <p className="mt-2 text-sm opacity-50">ADICIONE UM VÍDEO PARA COMEÇAR</p>
                  </div>
                ) : (
                  getSortedAndFilteredVideos().map(video => (
                    <div key={video.videoId} className="video-card">
                      <div className="thumbnail-container">
                        <img 
                          className="video-thumbnail" 
                          src={video.thumbnail} 
                          alt={video.title}
                          loading="lazy"
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/320x180/0a0a0f/ff0000?text=YOUTUBE')}
                        />
                        <div className="video-overlay"></div>
                        <div className="play-icon" onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}>
                          ▶️
                        </div>
                      </div>
                      <div className="video-info">
                        <div className="video-title" title={video.title}>{video.title}</div>
                        <div className="flex items-center gap-2 mb-2">
                          <select
                            className="cyber-select text-xs py-1 px-2 h-auto"
                            style={{ marginBottom: 0, backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: 'rgba(255, 0, 0, 0.3)', color: '#ff6b6b', borderRadius: '8px' }}
                            value={video.folderId || 'default'}
                            onChange={(e) => changeVideoFolder(video.videoId, e.target.value)}
                          >
                            {folders.map(f => (
                              <option key={f.id} value={f.id} style={{ background: '#0a0a0f', color: '#fff' }}>📁 {f.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="video-meta">
                          <span>{new Date(video.addedAt).toLocaleDateString('pt-BR')}</span>
                          <button className="remove-btn" onClick={() => removeVideo(video.videoId)}>
                            🗑️ REMOVER
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </main>
          </div>
        </>
      )}

      {activeTab === 'analyze' && (
        <div className="max-w-4xl mx-auto">
          <div className="input-panel" style={{ borderColor: 'rgba(0, 136, 255, 0.2)' }}>
            <h2 className="text-2xl font-bold mb-6" style={{ background: 'linear-gradient(135deg, #fff, #0088ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🤖 ANÁLISE DE IMAGEM COM GEMINI
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="flex flex-col gap-4">
                <div 
                  className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/5"
                  style={{ borderColor: imagePreview ? '#0088ff' : 'rgba(255,255,255,0.2)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-64 object-contain rounded-lg" />
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mb-4 opacity-50" />
                      <p className="font-medium">Clique para fazer upload de uma imagem</p>
                      <p className="text-sm opacity-50 mt-2">JPG, PNG, WEBP suportados</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium opacity-80">Prompt de Análise</label>
                  <textarea 
                    className="cyber-input blue min-h-[100px] resize-y"
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    placeholder="O que você quer saber sobre esta imagem?"
                  />
                </div>

                <button 
                  className="cyber-btn blue flex items-center justify-center gap-2"
                  onClick={analyzeImage}
                  disabled={isAnalyzing || !imageFile}
                  style={{ opacity: (!imageFile || isAnalyzing) ? 0.5 : 1 }}
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> ANALISANDO...</>
                  ) : (
                    <><Camera className="w-5 h-5" /> ANALISAR IMAGEM</>
                  )}
                </button>
              </div>

              {/* Result Section */}
              <div className="flex flex-col">
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 h-full min-h-[300px]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0088ff' }}>
                    <ImageIcon className="w-5 h-5" /> RESULTADO DA ANÁLISE
                  </h3>
                  
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0088ff' }} />
                      <p>O Gemini está processando a imagem...</p>
                    </div>
                  ) : analysisResult ? (
                    <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                      {analysisResult}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                      <p>Faça o upload de uma imagem e clique em analisar para ver o resultado aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="cyber-toast" style={{ borderColor: toast.type === 'error' ? '#ff4444' : (activeTab === 'analyze' ? '#0088ff' : '#ff0000') }}>
          {toast.message}
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f19] border border-[#ff0000]/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(255,0,0,0.2)] max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-white">CRIAR NOVA PASTA</h3>
            <input
              type="text"
              className="cyber-input w-full mb-4"
              placeholder="Nome da pasta..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button className="cyber-btn secondary py-2 px-4" onClick={() => setIsCreateFolderModalOpen(false)}>CANCELAR</button>
              <button className="cyber-btn py-2 px-4" onClick={handleCreateFolder}>CRIAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirm Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f19] border border-[#ff0000]/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(255,0,0,0.2)] max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-[#ff4444]">⚠️ LIMPAR PLAYLIST</h3>
            <p className="mb-6 opacity-80">Tem certeza que deseja apagar todos os vídeos? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button className="cyber-btn secondary py-2 px-4" onClick={() => setIsClearConfirmOpen(false)}>CANCELAR</button>
              <button className="cyber-btn py-2 px-4" onClick={confirmClearAll}>SIM, LIMPAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {isEditFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f19] border border-[#0088ff]/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(0,136,255,0.2)] max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-white">✏️ EDITAR PASTA</h3>
            <input
              type="text"
              className="cyber-input blue w-full mb-4"
              placeholder="Novo nome da pasta..."
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button className="cyber-btn secondary py-2 px-4" onClick={() => setIsEditFolderModalOpen(false)}>CANCELAR</button>
              <button className="cyber-btn blue py-2 px-4" onClick={handleEditFolder}>SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirm Modal */}
      {isDeleteFolderConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f19] border border-[#ff0000]/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(255,0,0,0.2)] max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-[#ff4444]">⚠️ EXCLUIR PASTA</h3>
            <p className="mb-6 opacity-80">Tem certeza que deseja excluir esta pasta? Os vídeos dentro dela não serão apagados, eles serão movidos para a pasta "Geral".</p>
            <div className="flex justify-end gap-3">
              <button className="cyber-btn secondary py-2 px-4" onClick={() => setIsDeleteFolderConfirmOpen(false)}>CANCELAR</button>
              <button className="cyber-btn py-2 px-4" onClick={handleDeleteFolder}>SIM, EXCLUIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
