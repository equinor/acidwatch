# Acidwatch Infrastructure


To deploy:

Use PIM to activate the Owner role of the subscription.
```bash
az login
az account set --subscription 'S646-CCS Digital Playground'
az deployment sub create -l northeurope --template-file main.bicep
```
