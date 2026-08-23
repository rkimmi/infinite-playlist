import z from "zod";
import { useForm, SubmitHandler, SubmitErrorHandler } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

export type SignUpFormValues = z.infer<typeof formSchema>;

const formSchema = z
  .object({
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    username: z.string().min(1, { message: "username is required." }),
    password: z
      .string()
      .min(6, {
        message: "Password must be at least 6 characters.",
      })
      .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
      .regex(/[0-9]/, { message: "Contain at least one number." })
      .regex(/[^a-zA-Z0-9]/, {
        message: "Contain at least one special character.",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type SignupFormProps = {
  onSubmit: (data: SignupFormValues) => void;
};

export default function SignupForm({ onSubmit }: SignupFormProps) {
  const signupForm = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = signupForm;
  const submitSignup: SubmitHandler<SignupFormValues> = (data) =>
    onSubmit(data);

  const onError: SubmitErrorHandler<SignupFormValues> = (errors) =>
    console.log(errors);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)}>
      <label htmlFor="email">Email</label>
      <input {...register("email")} type="email" />
      {errors?.email && <p>{errors.email?.message}</p>}

      <label htmlFor="username"> Username</label>
      <input {...register("username")} type="text" />

      <label htmlFor="password">Password</label>
      <input {...register("password")} type="text" />

      {errors?.password && <p>{errors.password?.message}</p>}
      <label htmlFor="cofirmPassword">Confirm password</label>
      <input {...register("confirmPassword")} />
      {errors?.confirmPassword && <p>{errors.confirmPassword?.message}</p>}
      <input type="submit" />
    </form>
  );
}
