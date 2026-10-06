export type ThemeMode = 'dark' | 'light' | 'oled';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  initials: string;
  provider?: 'magic_link' | 'google';
  authenticatedAt: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  totalChunks: number;
  checksum?: string;
  iv?: string; // Base64

  // Smart Adaptive Compression
  isCompressed?: boolean;
  compressionAlgorithm?: 'gzip' | 'deflate' | 'image-adaptive';
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number; // e.g. 68%

  // Self-Destructive & Cryptographic Access Control
  isSelfDestructive?: boolean;
  expiresAt?: number;
  burnAfterDownload?: boolean;
  accessControlToken?: string;

  // Content Addressable Storage (CAS) & Delta Transfer
  casBlockHashes?: string[];
  checkpointOffset?: number;
}

export type TransferStatus = 'idle' | 'connecting' | 'preparing' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'queued_offline';

export interface SecurityScanStage {
  id: 'metadata' | 'hash' | 'magic_bytes' | 'heuristics' | 'sandbox' | 'decision';
  name: string;
  status: 'passed' | 'warning' | 'failed' | 'scanning';
  details: string;
}

export interface SecurityScanReport {
  verdict: 'safe' | 'suspicious' | 'malicious' | 'scanning';
  score: number; // 0-100
  detectedType: string;
  declaredType: string;
  stages: SecurityScanStage[];
  quarantined: boolean;
  timestamp: number;
  threatDetails?: string[];
}

export interface NetworkTelemetry {
  bandwidthBps: number;
  latencyMs: number;
  jitterMs: number;
  packetLossRate: number; // 0 - 1
  cpuUtilizationPercent: number; // 0 - 100
  diskWriteSpeedBps: number;
  chunkFailureCount: number;
  optimalChunkSize: number; // bytes e.g. 16KB - 256KB
  optimalParallelStreams: number; // 1 - 8
  expectedThroughputBps: number;
  networkHealthScore: number; // 0 - 100
  timestamp: number;
}

export interface OfflineQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  addedAt: number;
  targetRoomId: string;
  status: 'queued_offline' | 'transferring' | 'completed' | 'failed';
  checkpointChunkIndex: number;
  totalChunks: number;
  isSelfDestructive?: boolean;
  expiresInMinutes?: number;
}

export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  bytesTransferred: number;
  percent: number;
  speedBps: number;
  etaSeconds: number;
  status: TransferStatus;
  currentChunk: number;
  totalChunks: number;
  direction: 'sending' | 'receiving';
  peerDeviceName?: string;
  transportMode: 'webrtc' | 'relay' | 'local-lan';
  error?: string;

  // Advanced metadata indicators
  isCompressed?: boolean;
  compressionRatio?: number;
  isSelfDestructive?: boolean;
  expiresAt?: number;
  burnAfterDownload?: boolean;
  securityReport?: SecurityScanReport;
}

export interface ReceivedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  url: string;
  checksum: string;
  verified: boolean;
  receivedAt: number;
  senderDevice?: string;

  // Advanced feature properties
  isCompressed?: boolean;
  originalSize?: number;
  compressionRatio?: number;
  isSelfDestructive?: boolean;
  expiresAt?: number;
  burnAfterDownload?: boolean;
  burned?: boolean;
  securityReport?: SecurityScanReport;
}

export interface TransferHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: 'sent' | 'received';
  timestamp: number;
  speedAvgBps?: number;
  peerName?: string;
  status: 'completed' | 'cancelled' | 'failed';
  downloadUrl?: string;
}

export interface PeerDevice {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  batteryLevel?: number; // 0-100%
  batteryCharging?: boolean;
}

export interface FeedbackSubmission {
  id: string;
  rating: number; // 1-5
  category: 'suggestion' | 'bug' | 'evaluation' | 'feature';
  feedbackText: string;
  userEmail: string;
  userName?: string;
  targetEmail: string;
  deviceInfo?: string;
  transferStats?: {
    totalSent: number;
    totalReceived: number;
  };
  submittedAt: number;
}

export interface PeerTextMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderDeviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  text: string;
  timestamp: number;
  direction: 'sent' | 'received';
}

export interface ActivePeerUser {
  id: string;
  name: string;
  email?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  deviceName: string;
  roomId: string;
  joinedAt: number;
  lastActive: number;
  status: 'active' | 'idle' | 'online';
  isSelf?: boolean;
  batteryLevel?: number;
  batteryCharging?: boolean;
}

export interface ActiveUsersStats {
  totalOnlineUsers: number;
  totalRooms: number;
  users: ActivePeerUser[];
  timestamp: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  deviceName: string;
  roomId?: string;
  firstSeen: number;
  lastActive: number;
  transferCount: number;
  status: 'online' | 'offline';
}

export interface AdminFeedbackRecord {
  id: string;
  targetRecipient: string;
  rating: number;
  category: string;
  feedbackText: string;
  userEmail: string;
  userName: string;
  deviceInfo?: string;
  transferStats?: any;
  isMandatorySecondUsage?: boolean;
  submittedAt: number;
  status: string;
}

export interface AdminStats {
  totalTrackedUsers: number;
  activeConnections: number;
  activeRooms: number;
  totalFeedback: number;
  averageRating: number;
  uptimeSeconds: number;
  timestamp: number;
}

export interface AdminSession {
  token: string;
  email: string;
  name: string;
  authenticatedAt: number;
}

export interface ScannedQRConnection {
  id: string;
  url: string;
  roomId: string;
  scannedAt: number;
  label?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
}

export interface AdminPaymentSubmission {
  id: string;
  email: string;
  payerName: string;
  amount: number;
  utr: string;
  screenshotBase64: string;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: number;
}


