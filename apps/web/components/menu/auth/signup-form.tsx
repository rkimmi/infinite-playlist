import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitErrorHandler } from "react-hook-form";

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
  onSubmit: (data: SignUpFormValues) => void;
  isPending: boolean;
  error?: string;
};

export default function SignupForm({
  onSubmit,
  isPending,
  error,
}: SignupFormProps) {
  const signupForm = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = signupForm;

  const onError: SubmitErrorHandler<SignUpFormValues> = (errors) =>
    console.log(errors);

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onError)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "5px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="email">Email</label>
        <input {...register("email")} type="email" />
        {errors?.email && <p>{errors.email?.message}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="username"> Username</label>
        <input {...register("username")} type="text" />
        {errors?.username && <p>{errors.username?.message}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="password">Password</label>
        <input type="password" {...register("password")} type="text" />
        {errors?.password && <p>{errors.password?.message}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="cofirmPassword">Confirm password</label>
        <input type="password" {...register("confirmPassword")} />
        {errors?.confirmPassword && <p>{errors.confirmPassword?.message}</p>}
      </div>
      {error && <p>{error}</p>}
      <input type="submit" />
    </form>
  );
}
