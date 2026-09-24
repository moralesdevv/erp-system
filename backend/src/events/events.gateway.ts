import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRoles: string[];
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Validated at middleware level; allow here
      callback(null, true);
    },
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  afterInit() {
    // Authenticate every socket connection via JWT middleware
    this.server.use((socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new WsException('Authentication token required'));
        }

        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('jwt.accessSecret'),
        });

        socket.userId = payload.sub;
        socket.userRoles = payload.roles || [];
        next();
      } catch {
        next(new WsException('Invalid or expired token'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id} (user: ${client.userId})`, 'WebSocket');
    client.join(`user:${client.userId}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id} (user: ${client.userId})`, 'WebSocket');
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() room: string,
  ) {
    // Only admins can join admin rooms
    if (room.startsWith('admin:') && !client.userRoles.includes('super_admin') && !client.userRoles.includes('admin')) {
      throw new WsException('Insufficient permissions for this room');
    }
    client.join(room);
    return { event: 'joined', room };
  }

  // Broadcast to specific user
  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
