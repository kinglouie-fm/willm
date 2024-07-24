import { Controller, Post, Body, Res, UnauthorizedException, Get, Req, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { UserService } from './user.service';
import { SessionService } from '../session/session.service';

@Controller('user')
export class UserController {

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService
  ) {}

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('dataPrivacyConsent') dataPrivacyConsent: boolean,
    @Res() res: Response
  ): Promise<void> {
    if (!dataPrivacyConsent) {
      throw new UnauthorizedException('Data privacy consent is required.');
    }
    try {
      await this.userService.register(username, password);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      if (error.message === 'User already exists') {
        throw new BadRequestException('Username already taken');
      }
      throw error;
    }
  }


  @Post('login')
  async login(@Body('username') username: string, @Body('password') password: string, @Res() res: Response): Promise<any> {
    const isValid = await this.userService.validateUser(username, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = await this.userService.findUserByUsername(username);
    const token = this.userService.generateJwtToken(username);
    res.cookie('auth_token', token, { httpOnly: true, secure: false });

    const session = await this.sessionService.getCurrentSession(user._id.toString());

    return res.status(200).json({ message: 'Login successful', session });
  }

  @Post('logout')
  async logout(@Res() res: Response): Promise<any> {
    res.clearCookie('auth_token');
    return res.send({ message: 'Logout successful' });
  }

  @Get('profile')
  async profile(@Req() req: Request, @Res() res: Response): Promise<any> {
    const token = req.cookies['auth_token'];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const decoded = this.userService.verifyJwtToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json({ username: decoded.username });
  }
}
