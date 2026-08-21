import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required.');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(body: any) {
    const { name, email, password } = body;
    if (!name || !email || !password) {
      throw new UnauthorizedException(
        'Name, email, and password are required for registration.',
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email address already exists.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: trimmedEmail,
        password: hashedPassword,
        role: 'OWNER', // Public signups become OWNERS of their own workspace
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async createClient(ownerId: string, body: any) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner || owner.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only platform owners can create client accounts.',
      );
    }

    const { name, email, password, role } = body;
    if (!name || !email || !password) {
      throw new UnauthorizedException(
        'Name, email, and password are required for registration.',
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email address already exists.',
      );
    }

    const userRole = role === 'OWNER' ? 'OWNER' : 'CLIENT';
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await prisma.user.create({
      data: {
        name,
        email: trimmedEmail,
        password: hashedPassword,
        role: userRole,
      },
    });

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      role: client.role,
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
