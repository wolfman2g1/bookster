import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // Since we're returning the user object in validate(),
    // we need to extract the ID from it
    return request.user?.id; // Use id instead of sub
  },
);