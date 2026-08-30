import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitErrorHandler } from "react-hook-form";

export type LoginFormValues = z.infer<typeof formSchema>;

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string(),
});

type LoginFormProps = {
  onSubmit: (data: LoginFormValues) => void;
  error?: string;
  isPending: boolean;
};

export default function LoginForm({
  onSubmit,
  isPending,
  error,
}: LoginFormProps) {
  const signupForm = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = signupForm;

  const onError: SubmitErrorHandler<LoginFormValues> = (errors) =>
    console.error(errors);

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
        <label htmlFor="password">Password</label>
        <input type="password" {...register("password")} />
      </div>
      {error && <p>{error}</p>}
      <input type="submit" />
    </form>
  );
}
