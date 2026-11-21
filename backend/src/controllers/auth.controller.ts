import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AuthenticatedRequest, TokenPayload, UserRole } from '../types';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          trainingCentre: true,
          district: true,
        },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        trainingCentreId: user.trainingCentreId,
        districtId: user.districtId,
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          trainingCentre: user.trainingCentre,
          district: user.district,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  }

  /**
   * 1-Click Demo User Switcher:
   * Enables immediate role switching among the 6 demo users for testing and hackathon review.
   */
  public static async demoSwitch(req: Request, res: Response): Promise<void> {
    try {
      const { demoKey } = req.body; // e.g. "anika", "dev", "meera", "kabir", "neha", "farah"

      const demoEmailMap: Record<string, string> = {
        anika: 'anika@certiflow.gov.in',
        dev: 'dev@certiflow.gov.in',
        meera: 'meera@certiflow.gov.in',
        kabir: 'kabir@certiflow.gov.in',
        neha: 'neha@certiflow.gov.in',
        farah: 'farah@certiflow.gov.in',
      };

      const email = demoEmailMap[demoKey?.toLowerCase()];
      if (!email) {
        res.status(400).json({
          error: `Invalid demo user '${demoKey}'. Choose from: anika, dev, meera, kabir, neha, farah`,
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          trainingCentre: true,
          district: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: `Demo user ${email} not seeded yet` });
        return;
      }

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        trainingCentreId: user.trainingCentreId,
        districtId: user.districtId,
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          trainingCentre: user.trainingCentre,
          district: user.district,
        },
      });
    } catch (error) {
      console.error('Demo switch error:', error);
      res.status(500).json({ error: 'Internal server error switching demo user' });
    }
  }

  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          trainingCentre: true,
          district: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trainingCentre: user.trainingCentre,
        district: user.district,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }
}
