export class CreateUserDto {
    readonly username: string;
    readonly password: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly birthday: Date;
}
