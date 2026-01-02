import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }
  serializeUser(user: any, done: Function) {
    console.log('Serializing user:', user.id);
    // Store only the user ID in the session
    done(null, user.id);
  }

  async deserializeUser(userId: number, done: Function) {
    try {
      console.log('Deserializing user:', userId);

      // Validate userId
      if (!userId || isNaN(userId)) {
        done(null, null);
        return;
      }

      const user = await this.authService.findOne(Number(userId));

      if (user) {
        // Password should already be excluded by the select clause in findOne
        done(null, user);
      } else {
        done(null, null);
      }
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  }
}
