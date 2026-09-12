# E1 Terraform validation transcript excerpts

Source: Codex command transcript from the E1 implementation on 2026-09-08. These excerpts were preserved after completion without rerunning Terraform.

## Strict readonly initialization — transcript summary

Required command attempted:

```sh
terraform -chdir=terraform init -backend=false -lockfile=readonly -input=false -no-color
```

It failed before validation. The output reported `Provider dependency changes detected` and that the lock file was read-only. Inspection showed the committed baseline lock retained `hashicorp/null` 3.2.2 even though the current configuration does not require that provider. This is the same known stale-entry condition documented in `environment-notes.md`.

The readonly command did **not** prune or change the lock file: it refused the dependency-selection change. Any earlier shorthand saying readonly init pruned the entry is inaccurate.

## Backend-disabled initialization without readonly — exact captured stdout

Command:

```sh
terraform -chdir=terraform init -backend=false -input=false -no-color
```

```text
Initializing provider plugins...
- Reusing previous version of hashicorp/aws from the dependency lock file
- Reusing previous version of hashicorp/random from the dependency lock file
- Reusing previous version of hashicorp/archive from the dependency lock file
- Using previously-installed hashicorp/aws v5.50.0
- Using previously-installed hashicorp/random v3.6.2
- Using previously-installed hashicorp/archive v2.4.2
Terraform has made some changes to the provider dependency selections recorded
in the .terraform.lock.hcl file. Review those changes and commit them to your
version control system if they represent changes you intended to make.

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

The only lock diff was removal of the unused `registry.terraform.io/hashicorp/null` 3.2.2 block. No provider version changed.

## Validation — exact captured stdout

Command:

```sh
terraform -chdir=terraform validate -no-color
```

```text
Success! The configuration is valid.
```

This used the backend-disabled initialization and cached locked archive 2.4.2, AWS 5.50.0, and random 3.6.2 providers. It did not access backend state, plan, or apply.

## Exact lock restoration — exact captured result

The incidental unused-null deletion was restored to the tracked baseline after validation. Both commands exited 0 with no output:

```sh
git diff --exit-code -- terraform/.terraform.lock.hcl
git diff e22ea71..HEAD -- terraform/.terraform.lock.hcl
```

Therefore commit `fe1a239` contains no lock/provider selection change.
