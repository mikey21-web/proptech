/**
 * Customer Documents Integration Tests
 */

import { NextRequest } from 'next/server';

const mockFindMany = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    customerDocument: {
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
    customer: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/customer', () => ({
  requireCustomerAuth: jest.fn(),
}));

import { requireCustomerAuth } from '@/lib/customer';
const mockRequireCustomerAuth = requireCustomerAuth as jest.Mock;

describe('Customer Documents API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireCustomerAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com', role: 'customer', orgId: 'org1' },
      customerId: 'cust1',
      orgId: 'org1',
    });
  });

  describe('GET /api/customer/documents', () => {
    it('returns documents with checklist', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'doc1',
          type: 'aadhaar',
          documentNo: '1234',
          fileUrl: '/uploads/aadhaar.pdf',
          fileName: 'aadhaar.pdf',
          fileSize: 102400,
          isVerified: true,
          verifiedAt: new Date(),
          expiryDate: null,
          createdAt: new Date(),
        },
      ]);

      const { GET } = await import('@/app/api/customer/documents/route');
      const req = new NextRequest('http://localhost/api/customer/documents');
      const res = await GET(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data.documents).toHaveLength(1);
      expect(data.data.checklist).toBeDefined();
      expect(data.data.summary.requiredCompleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/customer/documents', () => {
    it('creates a document record with valid data', async () => {
      mockCreate.mockResolvedValue({
        id: 'doc2',
        type: 'pan',
        fileName: 'pan-card.pdf',
        fileSize: 51200,
        isVerified: false,
        createdAt: new Date(),
      });

      const { POST } = await import('@/app/api/customer/documents/route');
      const req = new NextRequest('http://localhost/api/customer/documents', {
        method: 'POST',
        body: JSON.stringify({
          type: 'pan',
          documentNo: 'ABCDE1234F',
          fileUrl: 'https://storage.example.com/pan-card.pdf',
          fileName: 'pan-card.pdf',
          fileSize: 51200,
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(res.status).toBe(201);
    });

    it('rejects files larger than 5MB', async () => {
      const { POST } = await import('@/app/api/customer/documents/route');
      const req = new NextRequest('http://localhost/api/customer/documents', {
        method: 'POST',
        body: JSON.stringify({
          type: 'aadhaar',
          fileUrl: 'https://storage.example.com/large.pdf',
          fileName: 'large.pdf',
          fileSize: 10 * 1024 * 1024, // 10MB
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects invalid file extensions', async () => {
      const { POST } = await import('@/app/api/customer/documents/route');
      const req = new NextRequest('http://localhost/api/customer/documents', {
        method: 'POST',
        body: JSON.stringify({
          type: 'aadhaar',
          fileUrl: 'https://storage.example.com/doc.exe',
          fileName: 'doc.exe',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(res.status).toBe(400);
    });
  });
});
